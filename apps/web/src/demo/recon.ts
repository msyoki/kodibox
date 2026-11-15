/**
 * Reconciliation glue for the prototype (ADR 0007: payment-agnostic). Everything here is pure and
 * operates on the in-memory DemoData. The matching/dedupe/allocation maths is the real engine in
 * `@kodibox/core`; this file converts web number cents to the engine's bigint at the edge and
 * turns engine results into demo-state changes. Statement lines never keep raw phone numbers:
 * only a hash (for matching) and a masked form (for display) survive.
 */
import {
  allocate,
  demoHashPhone,
  maskedPhoneOf,
  normalisePhone,
  parseBankStatement,
  parseMpesaStatement,
  parseSms,
  runReconcile,
  toCandidate,
  toRecord,
  type BankCsvMapping,
  type MatchCandidate,
  type ParseOutput,
  type PaymentRecord,
  type ReconcileResult,
  type ReconcileSummary,
  type RowError,
} from '../features/payments/reconcile-adapter';
import { DEMO_TODAY, seedData } from './seed';
import type {
  AuditEvent,
  DemoData,
  Invoice,
  Payment,
  PaymentChannel,
  PaymentClaim,
  PaymentInstruction,
  PaymentOrigin,
  StatementImportRecord,
  UnmatchedPayment,
  UnmatchedReason,
  UnmatchedSuggestion,
} from './types';

export const DEMO_NOW = '2026-11-02T10:00:00+03:00';
export const DEMO_ACTOR = 'Wanjiru Mwangi';

export type SourceKind = 'mpesa' | 'bank';
export const SOURCE_ACCOUNT: Record<SourceKind, string> = { mpesa: 'src_mpesa', bank: 'src_bank' };
export const SOURCE_LABEL: Record<SourceKind, string> = {
  mpesa: 'M-Pesa paybill / till',
  bank: 'Bank account',
};

export const REASON_LABEL: Record<string, string> = {
  account_ref_matches_unit_code: 'Account reference matches unit code',
  known_payer_phone: 'Known payer phone',
  amount_equals_open_balance: 'Amount equals open balance',
  amount_equals_monthly_rent: 'Amount equals monthly rent',
  ambiguous_between_leases: 'Ambiguous between units',
  no_signal: 'No matching signal',
};

export const UNMATCHED_REASON_LABEL: Record<UnmatchedReason, string> = {
  ambiguous: 'Ambiguous: two units scored alike',
  below_threshold: 'Below the auto-match threshold',
  conflict: 'Conflict, review: same code, different details',
  possible_duplicate: 'Possible duplicate: identical line without a reference',
  unverified_claim: 'Unverified claim: needs a statement line or approval',
  no_signal: 'No account, phone or amount signal',
};

export const ORIGIN_LABEL: Record<PaymentOrigin, string> = {
  statement: 'Statement import',
  claim: 'Verified claim',
  cash: 'Cash',
};

export const originOf = (p: Pick<Payment, 'origin' | 'channel'>): PaymentOrigin =>
  p.origin ?? (p.channel === 'cash' ? 'cash' : 'statement');

// ---- small helpers ----------------------------------------------------------------------

/** Engine UTC ISO to the demo's Africa/Nairobi offset string. */
export const toNairobi = (utcIso: string): string =>
  `${new Date(Date.parse(utcIso) + 3 * 3_600_000).toISOString().slice(0, 19)}+03:00`;

export function addAudit(
  d: DemoData,
  action: string,
  entity: string,
  summary: string,
  actor = DEMO_ACTOR,
): DemoData {
  const event: AuditEvent = {
    id: `ae_live_${d.auditEvents.length + 1}`,
    at: DEMO_NOW,
    actor,
    action,
    entity,
    summary,
  };
  return { ...d, auditEvents: [event, ...d.auditEvents] };
}

export function applyToInvoice(invoices: Invoice[], invoiceId: string, amount: number): Invoice[] {
  return invoices.map((i) => {
    if (i.id !== invoiceId) return i;
    const paid = Math.min(i.total, i.paid + amount);
    const balance = i.total - paid;
    return {
      ...i,
      paid,
      balance,
      status: balance === 0 ? 'paid' : 'partial',
      oldestUnpaidDays: balance === 0 ? 0 : i.oldestUnpaidDays,
    };
  });
}

// ---- engine inputs from demo state -------------------------------------------------------

export function buildCandidates(d: DemoData): MatchCandidate[] {
  const out: MatchCandidate[] = [];
  for (const t of d.tenants) {
    const lease = d.leases.find((l) => l.id === t.leaseId);
    const unit = d.units.find((u) => u.id === t.unitId);
    if (!lease || !unit || lease.status === 'ended') continue;
    const e164 = normalisePhone(t.phone);
    out.push(
      toCandidate(
        {
          tenantId: t.id,
          leaseId: lease.id,
          unitCode: unit.code,
          monthlyRent: BigInt(lease.rent),
          knownPayerPhoneHashes: e164 ? [demoHashPhone(e164)] : [],
          openInvoices: d.invoices
            .filter((i) => i.tenantId === t.id && i.balance > 0)
            .map((i) => ({
              tenantId: t.id,
              leaseId: lease.id,
              unitCode: unit.code,
              invoiceId: i.id,
              balance: BigInt(i.balance),
              dueDate: i.dueDate,
            })),
        },
        Object.values(SOURCE_ACCOUNT),
      ),
    );
  }
  return out;
}

const kindOfChannel = (c: PaymentChannel): SourceKind => (c === 'bank' ? 'bank' : 'mpesa');

const claimLease = (d: DemoData, c: PaymentClaim): string | undefined =>
  d.tenants.find((t) => t.id === c.tenantId)?.leaseId ??
  d.tenants.find((t) => d.units.find((u) => u.id === t.unitId)?.code === c.unitCode)?.leaseId;

/** Everything Kodibox already knows about, so re-importing is a no-op and claims can merge. */
export function buildExisting(d: DemoData): PaymentRecord[] {
  const rec = (
    id: string,
    source: PaymentRecord['source'],
    kind: SourceKind,
    ref: string | undefined,
    amount: number,
    at: string,
    status: PaymentRecord['status'],
  ): PaymentRecord => ({
    id,
    source,
    sourceKind: kind,
    sourceAccountId: SOURCE_ACCOUNT[kind],
    ...(ref ? { externalRef: ref.replace(/\s+/g, '').toUpperCase() } : {}),
    amount: BigInt(amount),
    currency: 'KES',
    paidAt: new Date(Date.parse(at)).toISOString(),
    status,
  });
  const out: PaymentRecord[] = [];
  for (const p of d.payments) {
    if (p.channel === 'cash' || p.status === 'rejected') continue;
    out.push(
      rec(
        p.id,
        'import',
        kindOfChannel(p.channel),
        p.reference,
        p.amount,
        p.receivedAt,
        'verified',
      ),
    );
  }
  for (const u of [...d.unmatched, ...d.notRent]) {
    out.push(
      rec(
        u.id,
        'import',
        kindOfChannel(u.channel),
        u.reference,
        u.amount,
        u.receivedAt,
        'verified',
      ),
    );
  }
  for (const c of d.claims) {
    if (c.status !== 'pending' || !c.code || c.amount === undefined || !c.paidAt) continue;
    out.push({
      ...rec(c.id, 'claim', 'mpesa', c.code, c.amount, c.paidAt, 'unverified'),
      ...(c.unitCode ? { accountRef: c.unitCode } : {}),
      ...(claimLease(d, c) ? { claimLeaseId: claimLease(d, c) } : {}),
    });
  }
  return out;
}

// ---- parsing & preview -------------------------------------------------------------------

export type ParseResult = { ok: true; value: ParseOutput } | { ok: false; message: string };

export function parseStatement(
  kind: SourceKind,
  text: string,
  mapping?: BankCsvMapping,
): ParseResult {
  if (kind === 'bank' && !mapping) return { ok: false, message: 'Map the columns first.' };
  const r =
    kind === 'mpesa'
      ? parseMpesaStatement(text)
      : parseBankStatement(text, mapping as BankCsvMapping);
  return r.ok ? { ok: true, value: r.value } : { ok: false, message: r.error.message };
}

/** Column headers of a bank CSV (first row with at least 3 filled cells), for the mapping step. */
export function sniffBankHeaders(text: string): string[] {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.split(',').map((c) => c.replace(/^"|"$/g, '').trim()))
    .filter((r) => r.filter(Boolean).length >= 3);
  return rows[0] ?? [];
}

export interface ImportPreview {
  importId: string;
  kind: SourceKind;
  sourceLabel: string;
  fileName: string;
  rowErrors: readonly RowError[];
  skipped: number;
  result: ReconcileSummary;
  /** Claims whose statement line was paid to the claimant's own lease. */
  verifiedClaimIds: string[];
  /** Claims whose code was found but paid to a different unit (or left unmatched). */
  reviewClaimIds: string[];
  /** Claims contradicted by a statement line with the same code: consider rejecting. */
  flagClaimIds: string[];
  /** Masked payer phone by record id (display only; the raw number is never kept). */
  maskedPhones: Record<string, string>;
  counts: {
    fresh: number;
    duplicates: number;
    autoMatched: number;
    needsReview: number;
    rowErrors: number;
    claimsVerified: number;
    /** Same code with a different amount/date/account: always goes to review. */
    conflicts: number;
    possibleDuplicates: number;
    alerts: number;
  };
}

export function previewImport(
  d: DemoData,
  parsed: ParseOutput,
  meta: { kind: SourceKind; fileName: string },
): ImportPreview {
  const importId = `imp_${d.statementImports.length + 1}`;
  const maskedPhones: Record<string, string> = {};
  const records = parsed.lines.map((line) => {
    const id = `${importId}_r${line.row}`;
    const masked = maskedPhoneOf(line);
    if (masked) maskedPhones[id] = masked;
    return toRecord(line, {
      id,
      source: 'import',
      sourceAccountId: SOURCE_ACCOUNT[meta.kind],
    });
  });
  const result = runReconcile(records, buildExisting(d), buildCandidates(d));
  // The engine verifies a claim only when its statement line matched the claimant's own lease.
  const verifiedClaimIds = result.claimsVerified.map((m) => m.claim.id);
  const reviewClaimIds = result.claimsNeedReview.map((r) => r.merge.claim.id);
  // A statement line that disagrees with an unverified claim is processed normally and the
  // claim is flagged for rejection.
  const flagClaimIds = result.conflicts.map((c) => c.claimToReject).filter((x): x is string => !!x);
  const queued = result.conflicts.filter((c) => c.kind !== 'claim_conflict');
  const review = result.unmatched.length + queued.length + result.possibleDuplicates.length;
  return {
    importId,
    kind: meta.kind,
    sourceLabel: SOURCE_LABEL[meta.kind],
    fileName: meta.fileName,
    rowErrors: parsed.rowErrors,
    skipped: parsed.skipped,
    result,
    verifiedClaimIds,
    reviewClaimIds,
    flagClaimIds,
    maskedPhones,
    counts: {
      fresh: result.matched.length + result.unmatched.length,
      duplicates: result.duplicates.length,
      autoMatched: result.matched.length,
      needsReview: review,
      rowErrors: parsed.rowErrors.length,
      claimsVerified: verifiedClaimIds.length,
      conflicts: queued.length,
      possibleDuplicates: result.possibleDuplicates.length,
      alerts: result.alerts.length,
    },
  };
}

// ---- posting ----------------------------------------------------------------------------

interface PostMeta {
  channel: PaymentChannel;
  reference: string;
  receivedAt: string;
  origin: PaymentOrigin;
  idBase: string;
}

/** Create Payment rows for explicit allocations (number cents) and bank any credit. */
function postAllocations(
  d: DemoData,
  tenantId: string,
  allocations: { invoiceId: string; amount: number }[],
  credit: number,
  meta: PostMeta,
): DemoData {
  const tenant = d.tenants.find((t) => t.id === tenantId);
  if (!tenant) return d;
  let invoices = d.invoices;
  const payments: Payment[] = [];
  const mk = (invoiceId: string, amount: number, n: number): Payment => ({
    id: `pay_${meta.idBase}_${n}`,
    tenantId,
    unitId: tenant.unitId,
    propertyId: tenant.propertyId,
    invoiceId,
    amount,
    channel: meta.channel,
    reference: meta.reference,
    receivedAt: meta.receivedAt,
    status: 'matched',
    origin: meta.origin,
  });
  allocations.forEach((a, i) => {
    payments.push(mk(a.invoiceId, a.amount, i));
    invoices = applyToInvoice(invoices, a.invoiceId, a.amount);
  });
  if (allocations.length === 0 && credit > 0) {
    const latest = [...d.invoices]
      .filter((i) => i.tenantId === tenantId)
      .sort((a, b) => b.dueDate.localeCompare(a.dueDate))[0];
    if (latest) payments.push(mk(latest.id, credit, 0));
  }
  return {
    ...d,
    invoices,
    payments: [...payments, ...d.payments],
    tenantCredits:
      credit > 0
        ? { ...d.tenantCredits, [tenantId]: (d.tenantCredits[tenantId] ?? 0) + credit }
        : d.tenantCredits,
  };
}

/** Oldest-due-first allocation of `amount` over the tenant's open invoices (engine `allocate`). */
function allocateToTenant(
  d: DemoData,
  tenantId: string,
  amount: number,
  preferInvoiceId?: string,
): { allocations: { invoiceId: string; amount: number }[]; credit: number } {
  const open = d.invoices
    .filter((i) => i.tenantId === tenantId && i.balance > 0)
    .map((i) => ({
      invoiceId: i.id,
      balance: BigInt(i.balance),
      dueDate: i.id === preferInvoiceId ? '0000-00-00' : i.dueDate,
    }));
  const r = allocate(BigInt(amount), open);
  if (!r.ok) return { allocations: [], credit: 0 };
  return {
    allocations: r.value.allocations.map((a) => ({
      invoiceId: a.invoiceId,
      amount: Number(a.amount),
    })),
    credit: Number(r.value.credit),
  };
}

const unmatchedFromEngine = (
  d: DemoData,
  preview: ImportPreview,
  u: ReconcileResult['unmatched'][number],
): UnmatchedPayment => {
  const candidates = buildCandidates(d);
  const suggestions: UnmatchedSuggestion[] = [];
  for (const alt of u.match?.alternatives ?? []) {
    const cand = candidates.find((c) => c.leaseId === alt.target.leaseId);
    const inv = cand?.openInvoices
      .filter((i) => i.balance > 0n)
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate))[0];
    if (!cand || !inv) continue;
    suggestions.push({
      tenantId: cand.tenantId,
      invoiceId: inv.invoiceId,
      reason: alt.reasons.map((r) => REASON_LABEL[r] ?? r).join(' + '),
      confidence: alt.confidence,
    });
  }
  const r = u.record;
  const known: UnmatchedReason[] = ['ambiguous', 'below_threshold', 'conflict', 'unverified_claim'];
  const reason: UnmatchedReason = known.find((k) => k === u.reason) ?? 'no_signal';
  const masked = preview.maskedPhones[r.id];
  return {
    id: r.id,
    reference: r.externalRef ?? r.id,
    amount: Number(r.amount),
    payerName: r.payerName ?? 'Unknown payer',
    payerPhone: '',
    ...(masked ? { payerPhoneMasked: masked } : {}),
    accountEntered: r.accountRef ?? '',
    channel: preview.kind === 'bank' ? 'bank' : 'mpesa_paybill',
    receivedAt: toNairobi(r.paidAt),
    suggestions,
    reason,
    confidence: u.match?.confidence ?? 0,
  };
};

/** Commit a preview: payments appear, invoice balances drop, overpayments become tenant credit. */
export function applyImport(d: DemoData, preview: ImportPreview, actor = DEMO_ACTOR): DemoData {
  let next = d;
  const channel: PaymentChannel = preview.kind === 'bank' ? 'bank' : 'mpesa_paybill';
  const verified = new Set(preview.verifiedClaimIds);
  const review = new Set(preview.reviewClaimIds);
  const flagged = new Set(preview.flagClaimIds);

  for (const m of preview.result.matched) {
    next = postAllocations(
      next,
      m.target.tenantId,
      m.allocations.map((a) => ({ invoiceId: a.invoiceId, amount: Number(a.amount) })),
      Number(m.credit),
      {
        channel,
        reference: m.record.externalRef ?? m.record.id,
        receivedAt: toNairobi(m.record.paidAt),
        origin: verified.has(m.record.id) ? 'claim' : 'statement',
        idBase: m.record.id,
      },
    );
  }
  const reviewRow = (
    r: PaymentRecord,
    reason: 'conflict' | 'possible_duplicate',
  ): UnmatchedPayment => ({
    id: `${r.id}_${reason}`,
    reference: r.externalRef ?? r.id,
    amount: Number(r.amount),
    payerName: r.payerName ?? 'Unknown payer',
    payerPhone: '',
    ...(preview.maskedPhones[r.id] ? { payerPhoneMasked: preview.maskedPhones[r.id] } : {}),
    accountEntered: r.accountRef ?? '',
    channel: preview.kind === 'bank' ? 'bank' : 'mpesa_paybill',
    receivedAt: toNairobi(r.paidAt),
    suggestions: [],
    reason,
    confidence: 0,
  });
  const unmatched = [
    ...preview.result.unmatched.map((u) => unmatchedFromEngine(d, preview, u)),
    ...preview.result.conflicts
      .filter((x) => x.kind !== 'claim_conflict')
      .map((x) => reviewRow(x.record, 'conflict')),
    ...preview.result.possibleDuplicates.map((x) => reviewRow(x.record, 'possible_duplicate')),
  ];
  const record: StatementImportRecord = {
    id: preview.importId,
    at: DEMO_NOW,
    sourceLabel: preview.sourceLabel,
    fileName: preview.fileName,
    fresh: preview.counts.fresh,
    duplicates: preview.counts.duplicates,
    autoMatched: preview.counts.autoMatched,
    needsReview: preview.counts.needsReview,
    rowErrors: preview.counts.rowErrors,
    claimsVerified: preview.counts.claimsVerified,
  };
  next = {
    ...next,
    unmatched: [...unmatched, ...next.unmatched],
    claims: next.claims.map((c) =>
      verified.has(c.id)
        ? {
            ...c,
            status: 'verified',
            note: 'Confirmed by a statement line',
            reviewedBy: 'Statement import',
          }
        : review.has(c.id)
          ? { ...c, note: 'Code found but paid to a different unit, review' }
          : flagged.has(c.id)
            ? {
                ...c,
                status: 'rejected',
                reviewedBy: 'Statement import',
                note: 'A statement line with this code has different details, so the claim was rejected',
              }
            : c,
    ),
    statementImports: [record, ...next.statementImports],
  };
  for (const id of flagged) {
    const c = d.claims.find((x) => x.id === id);
    next = addAudit(
      next,
      'claim.rejected',
      c?.code ?? id,
      `Claim ${c?.code ?? id} rejected automatically: statement line disagrees with it`,
      actor,
    );
  }
  for (const al of preview.result.alerts) {
    next = addAudit(
      next,
      'statement.alert',
      al.record.externalRef ?? al.record.id,
      `Line ${al.record.externalRef ?? al.record.id} conflicts with a verified payment (${al.fields.join(', ')}); sent to review`,
      actor,
    );
  }
  return addAudit(
    next,
    'statement.imported',
    preview.fileName,
    `Imported ${preview.fileName}: ${preview.counts.fresh} new, ${preview.counts.duplicates} duplicates, ${preview.counts.autoMatched} auto-matched, ${preview.counts.needsReview} to review`,
    actor,
  );
}

// ---- unmatched queue ---------------------------------------------------------------------

export function assignUnmatched(
  d: DemoData,
  unmatchedId: string,
  tenantId: string,
  invoiceId?: string,
  actor = DEMO_ACTOR,
): DemoData {
  const um = d.unmatched.find((u) => u.id === unmatchedId);
  const tenant = d.tenants.find((t) => t.id === tenantId);
  if (!um || !tenant) return d;
  const { allocations, credit } = allocateToTenant(d, tenantId, um.amount, invoiceId);
  const next = postAllocations(d, tenantId, allocations, credit, {
    channel: um.channel,
    reference: um.reference,
    receivedAt: um.receivedAt,
    origin: 'statement',
    idBase: `live_${um.id}`,
  });
  return addAudit(
    { ...next, unmatched: next.unmatched.filter((u) => u.id !== unmatchedId) },
    'payment.matched',
    um.reference,
    `Matched ${um.reference} to ${tenant.name}${credit > 0 ? ' (overpayment kept as credit)' : ''}`,
    actor,
  );
}

export function splitUnmatched(
  d: DemoData,
  unmatchedId: string,
  parts: { tenantId: string; amount: number }[],
  actor = DEMO_ACTOR,
): DemoData {
  const um = d.unmatched.find((u) => u.id === unmatchedId);
  if (!um || parts.length < 2) return d;
  if (parts.reduce((s, p) => s + p.amount, 0) !== um.amount || parts.some((p) => p.amount <= 0)) {
    return d;
  }
  let next = d;
  parts.forEach((p, i) => {
    const { allocations, credit } = allocateToTenant(next, p.tenantId, p.amount);
    next = postAllocations(next, p.tenantId, allocations, credit, {
      channel: um.channel,
      reference: um.reference,
      receivedAt: um.receivedAt,
      origin: 'statement',
      idBase: `live_${um.id}_s${i}`,
    });
  });
  const names = parts
    .map((p) => d.tenants.find((t) => t.id === p.tenantId)?.name ?? p.tenantId)
    .join(' and ');
  return addAudit(
    { ...next, unmatched: next.unmatched.filter((u) => u.id !== unmatchedId) },
    'payment.split',
    um.reference,
    `Split ${um.reference} across ${names}`,
    actor,
  );
}

export function ignoreUnmatched(d: DemoData, unmatchedId: string, actor = DEMO_ACTOR): DemoData {
  const um = d.unmatched.find((u) => u.id === unmatchedId);
  if (!um) return d;
  return addAudit(
    {
      ...d,
      unmatched: d.unmatched.filter((u) => u.id !== unmatchedId),
      notRent: [um, ...d.notRent],
    },
    'payment.marked_not_rent',
    um.reference,
    `Marked ${um.reference} as not rent`,
    actor,
  );
}

export function restoreNotRent(d: DemoData, id: string, actor = DEMO_ACTOR): DemoData {
  const um = d.notRent.find((u) => u.id === id);
  if (!um) return d;
  return addAudit(
    { ...d, notRent: d.notRent.filter((u) => u.id !== id), unmatched: [um, ...d.unmatched] },
    'payment.not_rent_reversed',
    um.reference,
    `Moved ${um.reference} back to the unmatched queue`,
    actor,
  );
}

// ---- tenant claims -----------------------------------------------------------------------

export type ClaimInput =
  | { kind: 'sms'; tenantId: string; sms: string }
  | { kind: 'slip'; tenantId: string; slipName: string; amount: number; code?: string };

export type SmsPreview =
  | {
      ok: true;
      code: string;
      amount: number;
      paidAt: string;
      accountRef?: string;
      payee?: string;
      payeeMismatch: boolean;
    }
  | { ok: false; message: string };

/** The org's M-Pesa payee names, from payment instructions. */
export const payeeNamesOf = (d: DemoData): string[] =>
  d.paymentInstructions.map((p) => p.payeeName).filter(Boolean);

/** Live parse of a pasted M-Pesa SMS. Validates the code and amount are present. */
export function previewSms(text: string, expectedPayees: readonly string[] = []): SmsPreview {
  const r = parseSms(text, expectedPayees);
  if (!r.ok) return { ok: false, message: r.error.message };
  const line = r.value.lines[0];
  if (!line?.externalRef || line.amount <= 0n) {
    return { ok: false, message: 'The transaction code or amount is missing from the message.' };
  }
  return {
    ok: true,
    code: line.externalRef,
    amount: Number(line.amount),
    paidAt: toNairobi(line.paidAt),
    ...(line.accountRef ? { accountRef: line.accountRef } : {}),
    ...(line.payee ? { payee: line.payee } : {}),
    payeeMismatch: r.value.payeeMismatch === true,
  };
}

export function submitClaim(d: DemoData, input: ClaimInput): DemoData {
  const tenant = d.tenants.find((t) => t.id === input.tenantId);
  const unit = tenant ? d.units.find((u) => u.id === tenant.unitId) : undefined;
  if (!tenant || !unit) return d;
  const id = `clm_live_${d.claims.length + 1}`;
  const base = {
    id,
    tenantId: tenant.id,
    tenantName: tenant.name,
    unitCode: unit.code,
    status: 'pending' as const,
    submittedAt: DEMO_NOW,
  };
  let claim: PaymentClaim;
  if (input.kind === 'sms') {
    const p = previewSms(input.sms, payeeNamesOf(d));
    if (!p.ok) return d;
    claim = {
      ...base,
      kind: 'sms',
      sms: input.sms,
      code: p.code,
      amount: p.amount,
      paidAt: p.paidAt,
      ...(p.payeeMismatch ? { payeeMismatch: true } : {}),
    };
  } else {
    if (input.amount <= 0) return d;
    claim = {
      ...base,
      kind: 'slip',
      slipName: input.slipName,
      amount: input.amount,
      ...(input.code ? { code: input.code.replace(/\s+/g, '').toUpperCase() } : {}),
    };
  }
  // A claim for a line that is already in the books is verified straight away.
  const code = claim.code;
  const known = code
    ? d.payments.some((p) => p.reference.toUpperCase() === code && p.tenantId === tenant.id)
    : false;
  if (known) {
    claim = {
      ...claim,
      status: 'verified',
      note: 'Already confirmed by an imported statement line',
    };
  }
  return addAudit(
    { ...d, claims: [claim, ...d.claims] },
    'claim.submitted',
    claim.code ?? id,
    `${tenant.name} (${unit.code}) submitted a payment claim${claim.code ? ` ${claim.code}` : ''}`,
    tenant.name,
  );
}

export function approveClaim(
  d: DemoData,
  claimId: string,
  note: string,
  assignTenantId?: string,
  actor = DEMO_ACTOR,
): DemoData {
  const c = d.claims.find((x) => x.id === claimId);
  const tenantId = c?.tenantId ?? assignTenantId;
  if (
    !c ||
    c.status !== 'pending' ||
    !tenantId ||
    c.amount === undefined ||
    note.trim().length < 3
  ) {
    return d;
  }
  const { allocations, credit } = allocateToTenant(d, tenantId, c.amount);
  const next = postAllocations(d, tenantId, allocations, credit, {
    channel: c.kind === 'slip' ? 'bank' : 'mpesa_paybill',
    reference: c.code ?? `SLIP-${c.id}`,
    receivedAt: c.paidAt ?? DEMO_NOW,
    origin: 'claim',
    idBase: `live_${c.id}`,
  });
  return addAudit(
    {
      ...next,
      claims: next.claims.map((x) =>
        x.id === claimId
          ? { ...x, tenantId, status: 'approved', reviewedBy: actor, note: note.trim() }
          : x,
      ),
    },
    'claim.approved',
    c.code ?? c.id,
    `Approved claim ${c.code ?? c.id} for ${c.unitCode}: ${note.trim()}`,
    actor,
  );
}

export function rejectClaim(
  d: DemoData,
  claimId: string,
  reason: string,
  actor = DEMO_ACTOR,
): DemoData {
  const c = d.claims.find((x) => x.id === claimId);
  if (!c || c.status !== 'pending' || reason.trim().length < 3) return d;
  return addAudit(
    {
      ...d,
      claims: d.claims.map((x) =>
        x.id === claimId ? { ...x, status: 'rejected', reviewedBy: actor, note: reason.trim() } : x,
      ),
    },
    'claim.rejected',
    c.code ?? c.id,
    `Rejected claim ${c.code ?? c.id} for ${c.unitCode}: ${reason.trim()}`,
    actor,
  );
}

// ---- payment instructions ----------------------------------------------------------------

export function getInstruction(d: DemoData, propertyId?: string): PaymentInstruction {
  const org = d.paymentInstructions.find((p) => p.scope === 'org');
  const fallback: PaymentInstruction = {
    id: 'pi_org',
    scope: 'org',
    mpesaKind: 'paybill',
    mpesaNumber: d.org.paybill,
    payeeName: '',
    accountRule: 'unit_code',
    bankName: '',
    bankAccount: '',
    bankBranch: '',
  };
  return (
    (propertyId && d.paymentInstructions.find((p) => p.scope === propertyId)) || org || fallback
  );
}

/** One-line pay instructions for invoices and SMS. */
export function instructionLine(i: PaymentInstruction, unitCode: string): string {
  const parts: string[] = [];
  if (i.mpesaKind === 'paybill') {
    parts.push(`M-Pesa Paybill ${i.mpesaNumber}, Account ${unitCode}`);
  }
  if (i.mpesaKind === 'till') parts.push(`M-Pesa Till ${i.mpesaNumber}`);
  if (i.bankName && i.bankAccount) {
    parts.push(
      `${i.bankName} A/C ${i.bankAccount}${i.bankBranch ? ` (${i.bankBranch})` : ''}, ref ${unitCode}`,
    );
  }
  return parts.join(' or ') || 'Ask your landlord for payment details';
}

export function reminderSms(
  i: PaymentInstruction,
  unitCode: string,
  tenantName: string,
  amountText: string,
): string {
  const first = tenantName.split(' ')[0] ?? tenantName;
  return `Hi ${first}, your rent balance is ${amountText}. Pay via ${instructionLine(i, unitCode)}. Reply STOP to opt out.`;
}

export function savePaymentInstruction(
  d: DemoData,
  i: PaymentInstruction,
  actor = DEMO_ACTOR,
): DemoData {
  const exists = d.paymentInstructions.some((p) => p.id === i.id);
  return addAudit(
    {
      ...d,
      paymentInstructions: exists
        ? d.paymentInstructions.map((p) => (p.id === i.id ? i : p))
        : [...d.paymentInstructions, i],
    },
    'settings.payment_instructions_changed',
    i.scope,
    `Updated payment instructions (${i.scope === 'org' ? 'default' : i.scope})`,
    actor,
  );
}

// ---- status for dashboard / alerts -------------------------------------------------------

export interface ReconStatus {
  lastImportAt: string | null;
  /** Whole days between the last import and the demo "today"; null when never imported. */
  lastImportDaysAgo: number | null;
  claimsPending: number;
  unmatchedLines: number;
  unmatchedTotal: number;
}

export function getReconStatus(d: DemoData): ReconStatus {
  const last = d.statementImports[0];
  const days = last
    ? Math.max(
        0,
        Math.round((Date.parse(DEMO_TODAY) - Date.parse(last.at.slice(0, 10))) / 86_400_000),
      )
    : null;
  return {
    lastImportAt: last?.at ?? null,
    lastImportDaysAgo: days,
    claimsPending: d.claims.filter((c) => c.status === 'pending').length,
    unmatchedLines: d.unmatched.length,
    unmatchedTotal: d.unmatched.reduce((s, u) => s + u.amount, 0),
  };
}

export const daysAgoLabel = (n: number | null): string =>
  n === null ? 'never' : n === 0 ? 'today' : n === 1 ? '1 day ago' : `${n} days ago`;

/** Why a queue row is there, derived for seed rows that predate the engine fields. */
export function reasonOf(u: UnmatchedPayment): UnmatchedReason {
  if (u.reason) return u.reason;
  return u.suggestions.length > 0 ? 'below_threshold' : 'no_signal';
}

/** Tenant-side: how much more has been paid on this tenant's invoices than in the seed. */
export function tenantPaidDelta(d: DemoData, tenantId: string): number {
  const sum = (x: DemoData) =>
    x.invoices.filter((i) => i.tenantId === tenantId).reduce((s, i) => s + i.paid, 0);
  return sum(d) - sum(seedData);
}

/** Newest payment posted this session for a tenant (statement import, verified claim or approval). */
export function latestNewPayment(d: DemoData, tenantId: string): Payment | undefined {
  const old = new Set(seedData.payments.map((p) => p.id));
  return d.payments
    .filter((p) => p.tenantId === tenantId && !old.has(p.id))
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt))[0];
}
