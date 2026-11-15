import {
  compactRef,
  normaliseAccountRef,
  parseMpesaSms,
  parseMpesaStatementCsv,
  reconcile,
  toPaymentRecord,
  type MatchCandidate,
  type ParsedLine,
  type ScoredCandidate,
  type PaymentRecord,
} from '@kodibox/core';
import { createTestPhoneHasher } from '@kodibox/core/testing';
import {
  DEMO_TENANT_ID,
  SAMPLE_CLAIMS,
  SAMPLE_MPESA_STATEMENT_CSV,
  type DemoData,
} from '@kodibox/demo';

/**
 * The single adapter between the phone UI and the @kodibox/core reconciliation engine: every
 * engine call lives in this file so engine API changes stay local.
 *
 * Phone-side wiring of the reconciliation engine over demo data. Payments are never made or
 * detected here: this only reads statement lines and tenant proofs and suggests matches.
 */

const SOURCE_ACCOUNT = 'paybill-demo';

/** Demo/test hasher only. Production uses a server-side keyed HMAC hasher. */
const hashPhone = createTestPhoneHasher();

/** Names the landlord's paybill/till shows on a tenant's M-Pesa confirmation SMS (demo). */
const EXPECTED_PAYEES = ['RIVERSIDE COURT', 'MWANGI PROPERTIES'] as const;

export type ClaimStatus = 'pending' | 'verified_statement' | 'approved' | 'rejected';

export interface Claim {
  id: string;
  /** tenant: made in this demo session; seed: sample claims shown to the manager. */
  by: 'tenant' | 'seed';
  tenantId: string;
  tenantName: string;
  unitCode: string;
  /** M-Pesa transaction code, or "SLIP" for an attached slip. */
  code: string;
  amount: bigint;
  /** ISO UTC. */
  paidAt: string;
  accountRef?: string;
  via: 'sms' | 'slip';
  status: ClaimStatus;
  /** Lease the claimant says this payment is for (set for claims made in the app). */
  leaseId?: string;
  /** Pending only: a statement line had this code but could not be tied to the claimant's lease. */
  review?: boolean;
  reason?: string;
}

export const claimLabel = (c: Pick<Claim, 'status' | 'review'>): string =>
  c.status === 'pending' && c.review ? 'Code found, needs review' : CLAIM_LABEL[c.status];

export const claimTone = (c: Pick<Claim, 'status' | 'review'>) =>
  c.status === 'pending' && c.review ? ('info' as const) : CLAIM_TONE[c.status];

export const CLAIM_LABEL: Record<ClaimStatus, string> = {
  pending: 'Pending verification',
  verified_statement: 'Verified by statement',
  approved: 'Verified',
  rejected: 'Rejected',
};

export const CLAIM_TONE = {
  pending: 'warn',
  verified_statement: 'ok',
  approved: 'ok',
  rejected: 'danger',
} as const;

/** Leases the engine may match to, built from demo tenants and their open invoices. */
export function candidatesFromDemo(data: DemoData): MatchCandidate[] {
  const out: MatchCandidate[] = [];
  for (const t of data.tenants) {
    const unit = data.units.find((u) => u.id === t.unitId);
    if (!unit) continue;
    out.push({
      tenantId: t.id,
      leaseId: t.leaseId,
      unitCode: unit.code,
      monthlyRent: unit.rent,
      paymentSourceIds: [SOURCE_ACCOUNT],
      knownPayerPhoneHashes: [],
      openInvoices: data.invoices
        .filter((i) => i.tenantId === t.id && i.balance > 0n)
        .map((i) => ({
          tenantId: t.id,
          leaseId: t.leaseId,
          unitCode: unit.code,
          invoiceId: i.id,
          balance: i.balance,
          dueDate: i.dueDate,
        })),
    });
  }
  return out;
}

export interface ImportSuggestion {
  tenantId: string;
  unitCode: string;
  tenantName: string;
  confidence: number;
  /** True when this is only a hint from the typed reference, not an engine score. */
  guess?: boolean;
}

export interface ImportLine {
  id: string;
  code: string;
  amount: bigint;
  paidAt: string;
  payerName: string;
  accountRef: string;
  /** Why the engine did not auto-match. */
  reason: string;
  suggestions: ImportSuggestion[];
}

export interface ImportSummary {
  /** ISO UTC of the (demo) import. */
  at: string;
  fileName: string;
  newLines: number;
  duplicates: number;
  autoMatched: number;
  needsReview: number;
  claimsVerified: number;
  /** Lines that disagree with an already verified payment. */
  alerts: number;
  rowErrors: number;
}

export type ClaimOutcome =
  { kind: 'verified' } | { kind: 'review' } | { kind: 'rejected'; reason: string };

export interface ImportRun {
  summary: ImportSummary;
  unmatched: ImportLine[];
  /** What the statement did to each sample claim, by claim id. */
  claimOutcomes: Record<string, ClaimOutcome>;
  /** Statement lines that disagree with an already verified payment (owner alert). */
  alerts: number;
}

function claimRecord(line: ParsedLine, id: string, claimLeaseId?: string): PaymentRecord {
  return toPaymentRecord(line, {
    id,
    source: 'claim',
    sourceAccountId: SOURCE_ACCOUNT,
    ...(claimLeaseId ? { claimLeaseId } : {}),
  });
}

function leaseOfUnit(data: DemoData, unitCode: string): string | undefined {
  const unit = data.units.find((u) => u.code === unitCode);
  return data.tenants.find((t) => t.unitId === unit?.id)?.leaseId;
}

const nameOf = (data: DemoData, tenantId: string, fallback: string): string =>
  data.tenants.find((t) => t.id === tenantId)?.name ?? fallback;

/**
 * Suggested tenants for an unmatched line: the engine's alternatives first. When it has none, a
 * looser hint where the typed reference contains a unit code (for example "RENT B12" for B-12).
 */
function suggest(
  alternatives: readonly ScoredCandidate[],
  accountRef: string | undefined,
  candidates: readonly MatchCandidate[],
  data: DemoData,
): ImportSuggestion[] {
  if (alternatives.length > 0) {
    return alternatives.map((a) => ({
      tenantId: a.target.tenantId,
      unitCode: a.target.unitCode,
      tenantName: nameOf(data, a.target.tenantId, a.target.unitCode),
      confidence: a.confidence,
    }));
  }
  const typed = accountRef ? compactRef(accountRef) : '';
  if (typed.length < 3) return [];
  return candidates
    .filter((c) => typed.includes(compactRef(c.unitCode)))
    .slice(0, 3)
    .map((c) => ({
      tenantId: c.tenantId,
      unitCode: c.unitCode,
      tenantName: nameOf(data, c.tenantId, c.unitCode),
      confidence: 0.5,
      guess: true,
    }));
}

/** Run the engine over the sample M-Pesa statement against the demo leases and sample claims. */
export function runDemoImport(data: DemoData, at: string): ImportRun {
  const now = new Date(at);
  const candidates = candidatesFromDemo(data);
  const parsed = parseMpesaStatementCsv(SAMPLE_MPESA_STATEMENT_CSV, { hashPhone, now });
  const empty: ImportRun = {
    summary: {
      at,
      fileName: 'mpesa-statement-demo.csv',
      newLines: 0,
      duplicates: 0,
      autoMatched: 0,
      needsReview: 0,
      claimsVerified: 0,
      alerts: 0,
      rowErrors: 0,
    },
    unmatched: [],
    claimOutcomes: {},
    alerts: 0,
  };
  if (!parsed.ok) return empty;

  const existing: PaymentRecord[] = [];
  SAMPLE_CLAIMS.forEach((c, i) => {
    const sms = parseMpesaSms(c.sms, { now, expectedPayees: EXPECTED_PAYEES });
    const line = sms.ok ? sms.value.lines[0] : undefined;
    if (line) existing.push(claimRecord(line, `claim_${i + 1}`, leaseOfUnit(data, c.unitCode)));
  });
  const batch = parsed.value.lines.map((l, i) =>
    toPaymentRecord(l, { id: `imp_${i + 1}`, source: 'import', sourceAccountId: SOURCE_ACCOUNT }),
  );
  const result = reconcile(batch, { existing, candidates });

  const unmatched: ImportLine[] = result.unmatched.map((u) => ({
    id: u.record.id,
    code: u.record.externalRef ?? u.record.id,
    amount: u.record.amount,
    paidAt: u.record.paidAt,
    payerName: maskPayerName(u.record.payerName),
    accountRef: u.record.accountRef ?? '',
    reason: u.reason,
    suggestions: suggest(u.match?.alternatives ?? [], u.record.accountRef, candidates, data),
  }));

  // A statement only verifies a claim when it matched the claimant's own lease (claimsVerified).
  const claimOutcomes: Record<string, ClaimOutcome> = {};
  for (const m of result.claimsVerified) claimOutcomes[m.claim.id] = { kind: 'verified' };
  for (const r of result.claimsNeedReview) claimOutcomes[r.merge.claim.id] = { kind: 'review' };
  for (const c of result.conflicts) {
    if (c.kind === 'claim_conflict' && c.claimToReject) {
      claimOutcomes[c.claimToReject] = {
        kind: 'rejected',
        reason: 'Statement shows a different amount or date',
      };
    }
  }

  return {
    summary: {
      ...empty.summary,
      newLines: batch.length - result.duplicates.length,
      duplicates: result.duplicates.length,
      autoMatched: result.matched.length,
      needsReview: result.unmatched.length,
      claimsVerified: result.claimsVerified.length,
      alerts: result.alerts.length,
      rowErrors: parsed.value.rowErrors.length,
    },
    unmatched,
    claimOutcomes,
    alerts: result.alerts.length,
  };
}

/** A real tenant (not the signed-in persona) for sample claims whose unit is not in the roster. */
function fallbackTenant(data: DemoData) {
  const taken = new Set(SAMPLE_CLAIMS.map((c) => c.unitCode));
  return data.tenants.find((t) => {
    const code = data.units.find((u) => u.id === t.unitId)?.code;
    return code !== undefined && !taken.has(code) && t.id !== DEMO_TENANT_ID;
  });
}

/** Sample claims from other tenants, as the manager sees them. */
export function seedClaims(data: DemoData, outcomes: Record<string, ClaimOutcome>): Claim[] {
  const out: Claim[] = [];
  SAMPLE_CLAIMS.forEach((c, i) => {
    const sms = parseMpesaSms(c.sms, { now: new Date(), expectedPayees: EXPECTED_PAYEES });
    const line = sms.ok ? sms.value.lines[0] : undefined;
    if (!line) return;
    const outcome = outcomes[`claim_${i + 1}`];
    const code = line.externalRef ?? `CLAIM${i + 1}`;
    const tenant = data.tenants.find(
      (t) => data.units.find((u) => u.id === t.unitId)?.code === c.unitCode,
    );
    // Sample units that are not in the demo roster are shown against a real tenant, and every
    // claim is dated in the days before now so the list does not look stale.
    const shown = tenant ?? fallbackTenant(data);
    const shownUnit = data.units.find((u) => u.id === shown?.unitId)?.code ?? c.unitCode;
    out.push({
      id: `claim_${i + 1}`,
      by: 'seed',
      tenantId: shown?.id ?? `sample_${i + 1}`,
      tenantName: shown?.name ?? c.tenantName,
      unitCode: shownUnit,
      code,
      amount: line.amount,
      paidAt: new Date(Date.now() - (i + 1) * 86_400_000 - 2 * 3_600_000).toISOString(),
      ...(line.accountRef ? { accountRef: line.accountRef } : {}),
      via: 'sms',
      status:
        outcome?.kind === 'verified'
          ? 'verified_statement'
          : outcome?.kind === 'rejected'
            ? 'rejected'
            : 'pending',
      ...(outcome?.kind === 'review' ? { review: true } : {}),
      ...(outcome?.kind === 'rejected'
        ? { reason: `Rejected: ${outcome.reason.toLowerCase()}` }
        : {}),
    });
  });
  return out;
}

/** Same cap the engine applies to pasted SMS text. */
export const SMS_MAX_CHARS = 1000;

export interface SmsCheck {
  ok: boolean;
  /** Set when the text could not be read as an M-Pesa confirmation. */
  error?: string;
  line?: ParsedLine;
  warnings: string[];
}

/** Parse a pasted M-Pesa SMS and compare it with the tenant's unit code and what they owe. */
export function checkSms(
  text: string,
  unitCode: string,
  owed: bigint,
  formatMinor: (m: bigint) => string,
): SmsCheck {
  if (text.trim().length === 0) return { ok: false, warnings: [] };
  if (text.length > SMS_MAX_CHARS) {
    return {
      ok: false,
      error: 'That message is too long. Paste only the M-Pesa confirmation SMS.',
      warnings: [],
    };
  }
  const res = parseMpesaSms(text, { now: new Date(), expectedPayees: EXPECTED_PAYEES });
  if (!res.ok) return { ok: false, error: res.error.message, warnings: [] };
  const line = res.value.lines[0];
  if (!line) return { ok: false, error: 'No payment found in that message.', warnings: [] };
  const warnings: string[] = [];
  if (res.value.payeeMismatch) {
    warnings.push(
      `This payment went to ${line.payee ?? 'someone else'}, not your landlord's paybill. Check the business number.`,
    );
  }
  if (!line.accountRef) {
    warnings.push(
      `No account reference found. Use ${unitCode} next time so it matches automatically.`,
    );
  } else if (normaliseAccountRef(line.accountRef) !== normaliseAccountRef(unitCode)) {
    warnings.push(
      `Account reference is ${line.accountRef}, not your unit code ${unitCode}. Your landlord will check it.`,
    );
  }
  if (owed > 0n && line.amount !== owed) {
    warnings.push(`Amount ${formatMinor(line.amount)} differs from the ${formatMinor(owed)} due.`);
  }
  return { ok: true, line, warnings };
}

/**
 * Display-safe payer name: first name plus initial of the next word, upper-case. Any run of 7 or
 * more digits (a phone-like token) is dropped entirely.
 */
export function maskPayerName(raw: string | undefined): string {
  const words = (raw ?? '')
    .replace(/\+?\d[\d\s*-]{5,}\d/g, ' ')
    .split(/[^A-Za-z']+/)
    .filter((w) => w.length > 0);
  const [first, second] = words;
  if (!first) return 'Unknown payer';
  const cap = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
  return second ? `${cap} ${second.charAt(0).toUpperCase()}.` : cap;
}
