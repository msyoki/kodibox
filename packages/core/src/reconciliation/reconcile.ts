import { allocate } from './allocate';
import {
  dedupe,
  type ClaimMerge,
  type ConflictAlert,
  type ConflictRecord,
  type DuplicateRecord,
  type PossibleDuplicate,
} from './dedupe';
import { match } from './match';
import type {
  Allocation,
  MatchCandidate,
  MatchOptions,
  MatchResult,
  MatchTarget,
  OpenInvoice,
  PaymentRecord,
} from './types';

export type ReconcileState = {
  /** Records already stored (any status). */
  readonly existing: readonly PaymentRecord[];
  readonly candidates: readonly MatchCandidate[];
  readonly options?: MatchOptions;
};

export type MatchedPayment = {
  readonly record: PaymentRecord;
  readonly target: MatchTarget;
  readonly match: MatchResult;
  readonly allocations: readonly Allocation[];
  /** Overpayment to post as tenant credit. */
  readonly credit: bigint;
};

export type UnmatchedPayment = {
  readonly record: PaymentRecord;
  /**
   * invalid_amount | invalid_currency | inactive_record | unverified_claim | unverified |
   * below_threshold |
   * ambiguous | no_signal | duplicate_invoice
   */
  readonly reason: string;
  readonly match: MatchResult | null;
};

export type FlatAllocation = {
  readonly recordId: string;
  readonly leaseId: string;
  readonly invoiceId: string;
  readonly amount: bigint;
};

export type ClaimReview = {
  readonly merge: ClaimMerge;
  readonly reason:
    | 'no_claim_lease'
    | 'statement_unmatched'
    | 'lease_mismatch'
    | 'source_not_allowed'
    | 'duplicate_claim';
};

export type ReconcileResult = {
  readonly matched: readonly MatchedPayment[];
  readonly unmatched: readonly UnmatchedPayment[];
  readonly duplicates: readonly DuplicateRecord[];
  /**
   * Claims confirmed by a statement line that matched the claimed lease, with the claim's source
   * account among that lease's paymentSourceIds.
   */
  readonly claimsVerified: readonly ClaimMerge[];
  /**
   * Claims whose statement line was merged but could not be tied to the claimed lease (no
   * claimLeaseId, unmatched, different lease, or source not allowed). A manager must review.
   */
  readonly claimsNeedReview: readonly ClaimReview[];
  /** Same reference but different amount/date/account: never merged, never verifies a claim. */
  readonly conflicts: readonly ConflictRecord[];
  /** Conflicts against verified records: surface to the owner. */
  readonly alerts: readonly ConflictAlert[];
  readonly possibleDuplicates: readonly PossibleDuplicate[];
  readonly allocations: readonly FlatAllocation[];
};

/**
 * Dedupe a batch against stored records, then auto-match and allocate oldest-first. Invoice
 * balances are consumed as the batch is processed, so two payments cannot pay the same debt.
 * Pure and deterministic for the same input order. The caller persists and posts to the ledger.
 */
export const reconcile = (
  batch: readonly PaymentRecord[],
  state: ReconcileState,
): ReconcileResult => {
  const { fresh, duplicates, merges, conflicts, alerts, possibleDuplicates } = dedupe(
    state.existing,
    batch,
  );

  // Working copy of open balances, consumed as payments are allocated.
  // Keyed by lease + invoice so identical invoice ids on different leases cannot share a balance.
  const bkey = (leaseId: string, invoiceId: string): string => `${leaseId}|${invoiceId}`;
  const balances = new Map<string, bigint>();
  for (const c of state.candidates) {
    for (const i of c.openInvoices) balances.set(bkey(c.leaseId, i.invoiceId), i.balance);
  }
  const live = (c: MatchCandidate): MatchCandidate => ({
    ...c,
    openInvoices: c.openInvoices.map((i): OpenInvoice => ({
      ...i,
      balance: balances.get(bkey(c.leaseId, i.invoiceId)) ?? 0n,
    })),
  });

  const matched: MatchedPayment[] = [];
  const unmatched: UnmatchedPayment[] = [];
  const allocations: FlatAllocation[] = [];

  const toProcess = [...fresh, ...merges.map((m) => m.merged)].sort((a, b) =>
    a.paidAt === b.paidAt ? (a.id < b.id ? -1 : 1) : a.paidAt < b.paidAt ? -1 : 1,
  );

  for (const record of toProcess) {
    if ((record.currency as string) !== 'KES') {
      unmatched.push({ record, reason: 'invalid_currency', match: null });
      continue;
    }
    if (record.amount <= 0n) {
      unmatched.push({ record, reason: 'invalid_amount', match: null });
      continue;
    }
    if (record.status === 'reversed' || record.status === 'rejected') {
      unmatched.push({ record, reason: 'inactive_record', match: null });
      continue;
    }
    const result = match(record, state.candidates.map(live), state.options);
    // Only verified records are ever allocated (claims, and manual entries awaiting approval, are
    // evidence until a statement line or a checker verifies them).
    if (record.status !== 'verified') {
      unmatched.push({
        record,
        reason: record.source === 'claim' ? 'unverified_claim' : 'unverified',
        match: result,
      });
      continue;
    }
    if (!result.target) {
      unmatched.push({
        record,
        reason: result.ambiguous ? 'ambiguous' : 'no_signal',
        match: result,
      });
      continue;
    }
    if (!result.auto) {
      unmatched.push({ record, reason: 'below_threshold', match: result });
      continue;
    }
    const lease = state.candidates.find((c) => c.leaseId === result.target?.leaseId);
    const open = lease ? live(lease).openInvoices : [];
    const alloc = allocate(record.amount, open);
    if (!alloc.ok) {
      unmatched.push({ record, reason: alloc.error.code, match: result });
      continue;
    }
    for (const a of alloc.value.allocations) {
      const k = bkey(result.target.leaseId, a.invoiceId);
      balances.set(k, (balances.get(k) ?? 0n) - a.amount);
      allocations.push({ recordId: record.id, leaseId: result.target.leaseId, ...a });
    }
    matched.push({
      record,
      target: result.target,
      match: result,
      allocations: alloc.value.allocations,
      credit: alloc.value.credit,
    });
  }

  const claimsVerified: ClaimMerge[] = [];
  const claimsNeedReview: ClaimReview[] = [];
  const idMap = new Map<string, string>(); // default claim id -> chosen claim id
  const mergedRewrite = new Map<PaymentRecord, PaymentRecord>(); // merged record -> final (chosen id)
  for (const merge of merges) {
    const all = [merge.claim, ...merge.otherClaims];
    const hit = matched.find((m) => m.record.id === merge.merged.id);
    const leaseMatched = hit?.target.leaseId;
    // Prefer the claim made for the lease the statement line actually matched.
    const chosen = all.find((c) => c.claimLeaseId && c.claimLeaseId === leaseMatched) ?? all[0]!;
    const others = all.filter((c) => c !== chosen);
    if (chosen.id !== merge.merged.id) idMap.set(merge.merged.id, chosen.id);
    const mergedFinal: PaymentRecord = { ...merge.merged, id: chosen.id };
    mergedRewrite.set(merge.merged, mergedFinal);
    const final: ClaimMerge = { merged: mergedFinal, claim: chosen, otherClaims: others };
    for (const o of others) {
      claimsNeedReview.push({
        merge: { merged: mergedFinal, claim: o, otherClaims: [] },
        reason: 'duplicate_claim',
      });
    }
    const lease = chosen.claimLeaseId;
    let reason: ClaimReview['reason'] | null = null;
    if (!lease) reason = 'no_claim_lease';
    else if (!hit) reason = 'statement_unmatched';
    else if (leaseMatched !== lease) reason = 'lease_mismatch';
    else if (
      !state.candidates.some(
        (c) => c.leaseId === lease && c.paymentSourceIds.includes(merge.merged.sourceAccountId),
      )
    ) {
      reason = 'source_not_allowed';
    }
    if (reason) claimsNeedReview.push({ merge: final, reason });
    else claimsVerified.push(final);
  }
  if (idMap.size > 0) {
    const fix = (rec: PaymentRecord): PaymentRecord => {
      const id = idMap.get(rec.id);
      return id ? { ...rec, id } : rec;
    };
    matched.forEach((m, i) => {
      matched[i] = { ...m, record: fix(m.record) };
    });
    unmatched.forEach((u, i) => {
      unmatched[i] = { ...u, record: fix(u.record) };
    });
    allocations.forEach((a, i) => {
      allocations[i] = { ...a, recordId: idMap.get(a.recordId) ?? a.recordId };
    });
  }

  return {
    matched,
    unmatched,
    duplicates: duplicates.map((d) => ({ ...d, of: mergedRewrite.get(d.of) ?? d.of })),
    claimsVerified,
    claimsNeedReview,
    conflicts: conflicts.map((c) => ({ ...c, of: mergedRewrite.get(c.of) ?? c.of })),
    alerts: alerts.map((a) => ({ ...a, of: mergedRewrite.get(a.of) ?? a.of })),
    possibleDuplicates,
    allocations,
  };
};
