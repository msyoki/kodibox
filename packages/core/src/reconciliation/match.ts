import { compactRef } from './normalize';
import type {
  MatchCandidate,
  MatchOptions,
  MatchResult,
  PaymentRecord,
  ScoredCandidate,
} from './types';

const W_ACCOUNT_REF = 0.92;
const W_PHONE = 0.6;
const W_BALANCE = 0.3;
const W_RENT = 0.2;

const DAY_MS = 86_400_000;
const daysBetween = (paidAtIso: string, dueDate: string): number =>
  Math.abs(Date.parse(paidAtIso) - Date.parse(`${dueDate}T00:00:00Z`)) / DAY_MS;

/** Independent evidence combines as 1 - prod(1 - w). */
const combine = (weights: readonly number[]): number =>
  Math.round((1 - weights.reduce((p, w) => p * (1 - w), 1)) * 1000) / 1000;

const scoreCandidate = (
  record: PaymentRecord,
  c: MatchCandidate,
  windowDays: number,
): ScoredCandidate => {
  const reasons: string[] = [];
  const weights: number[] = [];

  if (record.accountRef && compactRef(record.accountRef) === compactRef(c.unitCode)) {
    weights.push(W_ACCOUNT_REF);
    reasons.push('account_ref_matches_unit_code');
  }
  if (record.payerPhoneHash && c.knownPayerPhoneHashes.includes(record.payerPhoneHash)) {
    weights.push(W_PHONE);
    reasons.push('known_payer_phone');
  }
  const near = c.openInvoices.filter(
    (i) => i.balance > 0n && daysBetween(record.paidAt, i.dueDate) <= windowDays,
  );
  if (near.some((i) => i.balance === record.amount)) {
    weights.push(W_BALANCE);
    reasons.push('amount_equals_open_balance');
  } else if (near.length > 0 && c.monthlyRent === record.amount) {
    weights.push(W_RENT);
    reasons.push('amount_equals_monthly_rent');
  }

  return {
    target: { tenantId: c.tenantId, leaseId: c.leaseId, unitCode: c.unitCode },
    confidence: combine(weights),
    reasons,
  };
};

/**
 * Score candidates for a payment. Ambiguity (two leases scoring within `ambiguityMargin`) yields
 * target null so nothing is auto-matched. Pure and deterministic (ties ordered by leaseId).
 */
export const match = (
  record: PaymentRecord,
  candidates: readonly MatchCandidate[],
  opts: MatchOptions = {},
): MatchResult => {
  const threshold = opts.autoThreshold ?? 0.9;
  const windowDays = opts.dateWindowDays ?? 15;
  const margin = opts.ambiguityMargin ?? 0.1;

  // Cross-landlord safety: only leases that accept payments into this source account.
  const eligible = candidates.filter((c) => c.paymentSourceIds.includes(record.sourceAccountId));
  const scored = eligible
    .map((c) => scoreCandidate(record, c, windowDays))
    .filter((s) => s.confidence > 0)
    .sort((a, b) =>
      b.confidence !== a.confidence
        ? b.confidence - a.confidence
        : a.target.leaseId < b.target.leaseId
          ? -1
          : 1,
    );
  const alternatives = scored.slice(0, 3);
  const best = scored[0];
  if (!best) {
    return {
      target: null,
      confidence: 0,
      reasons: ['no_signal'],
      auto: false,
      ambiguous: false,
      alternatives,
    };
  }
  const second = scored[1];
  if (second && best.confidence - second.confidence < margin) {
    return {
      target: null,
      confidence: best.confidence,
      reasons: [...best.reasons, 'ambiguous_between_leases'],
      auto: false,
      ambiguous: true,
      alternatives,
    };
  }
  return {
    target: best.target,
    confidence: best.confidence,
    reasons: best.reasons,
    auto: best.confidence >= threshold,
    ambiguous: false,
    alternatives,
  };
};
