import { compactRef, normaliseExternalRef } from './normalize';
import type { PaymentRecord } from './types';

export type DuplicateRecord = { readonly record: PaymentRecord; readonly of: PaymentRecord };

export type ClaimMerge = {
  /** Verified import record merged onto the claim: claim id kept, the record's own status kept. */
  readonly merged: PaymentRecord;
  readonly claim: PaymentRecord;
  /** Other pending claims with the same key; reconcile picks the one for the matched lease. */
  readonly otherClaims: readonly PaymentRecord[];
};

export type ConflictField = 'amount' | 'paidAt' | 'accountRef';

/**
 * Same reference, different facts.
 * - claim_conflict: a pending claim disagrees with a verified import line. The line is
 *   authoritative and processed; `claimToReject` is the claim id to reject.
 * - conflict_with_verified: disagrees with a verified record. Quarantined (not processed) and alerted.
 * - unverified_conflict: unverified records disagree, or an unverified/inactive record met a
 *   pending claim. Quarantined for review.
 */
export type ConflictRecord = {
  readonly record: PaymentRecord;
  readonly of: PaymentRecord;
  readonly fields: readonly ConflictField[];
  readonly kind: 'claim_conflict' | 'conflict_with_verified' | 'unverified_conflict';
  readonly claimToReject?: string;
};

/** A conflict against a verified record: needs owner review (possible tampering/fraud). */
export type ConflictAlert = ConflictRecord & {
  readonly kind: 'conflict_with_verified';
  /** Set when the offending record is a claim, so the UI can rate-limit the claimant. */
  readonly claimId?: string;
  readonly claimantLeaseId?: string;
};

/** Ref-less records with an identical fingerprint inside the same batch: kept for review. */
export type PossibleDuplicate = {
  readonly record: PaymentRecord;
  readonly of: PaymentRecord;
  /** 1-based position of `record` in the incoming batch. */
  readonly ordinal: number;
};

export type DedupeResult = {
  /** Records not seen before. */
  readonly fresh: readonly PaymentRecord[];
  readonly duplicates: readonly DuplicateRecord[];
  /** Claims confirmed by a verified import line. */
  readonly merges: readonly ClaimMerge[];
  readonly conflicts: readonly ConflictRecord[];
  readonly alerts: readonly ConflictAlert[];
  readonly possibleDuplicates: readonly PossibleDuplicate[];
};

const minute = (iso: string): string => iso.slice(0, 16);

const MPESA_TOLERANCE_MS = 10 * 60_000;
const BANK_TOLERANCE_MS = 24 * 3_600_000;

/**
 * Dedupe key from the normalised reference. M-Pesa receipts (sourceKind 'mpesa') are globally
 * unique, so they key on the reference alone (a claim and a statement line always meet whichever
 * account each names); other kinds key on (sourceAccountId, kind, reference). Null without a ref.
 */
export const dedupeKey = (r: PaymentRecord): string | null => {
  if (!r.externalRef) return null;
  const ref = normaliseExternalRef(r.externalRef);
  if (!ref) return null;
  return r.sourceKind === 'mpesa' ? `MPESA|${ref}` : `${r.sourceAccountId}|${r.sourceKind}|${ref}`;
};

/** Fallback for ref-less records: account + amount + paidAt minute + account reference. */
export const fingerprint = (r: PaymentRecord): string =>
  `${r.sourceAccountId}|${r.amount}|${minute(r.paidAt)}|${r.accountRef ? compactRef(r.accountRef) : ''}`;

const inactive = (r: PaymentRecord): boolean => r.status === 'reversed' || r.status === 'rejected';
const isPendingClaim = (r: PaymentRecord): boolean =>
  r.source === 'claim' && r.status === 'unverified';
/** Only a verified statement import may confirm a claim. */
const isAuthoritative = (r: PaymentRecord): boolean =>
  r.source === 'import' && r.status === 'verified';

const conflictFields = (a: PaymentRecord, b: PaymentRecord): ConflictField[] => {
  const fields: ConflictField[] = [];
  if (a.amount !== b.amount) fields.push('amount');
  const tol =
    a.sourceKind === 'mpesa' && b.sourceKind === 'mpesa' ? MPESA_TOLERANCE_MS : BANK_TOLERANCE_MS;
  if (Math.abs(Date.parse(a.paidAt) - Date.parse(b.paidAt)) > tol) fields.push('paidAt');
  if (a.accountRef && b.accountRef && compactRef(a.accountRef) !== compactRef(b.accountRef)) {
    fields.push('accountRef');
  }
  return fields;
};

/**
 * Split incoming records into fresh, duplicates, claim merges, conflicts and possible duplicates
 * against `existing` (and earlier records in the same batch). Re-importing the same statement
 * yields no fresh records.
 * - A claim is merged only by an incoming import record with status 'verified' that agrees with it;
 *   the merged record keeps its own status. Anything else touching a pending claim (unverified
 *   manual, reversed/rejected) is an unverified_conflict and waits for review.
 * - A verified import that disagrees with a pending claim is processed and the claim flagged.
 * - Several pending claims per key are all kept; reconcile chooses among them after matching.
 * Reversed or rejected existing records do not block a new line.
 */
export const dedupe = (
  existing: readonly PaymentRecord[],
  incoming: readonly PaymentRecord[],
): DedupeResult => {
  const byKey = new Map<string, PaymentRecord>();
  const pending = new Map<string, PaymentRecord[]>();
  const byPrint = new Map<string, PaymentRecord>();
  const batchPrints = new Set<string>();
  const index = (r: PaymentRecord): void => {
    if (inactive(r)) return;
    const k = dedupeKey(r);
    if (!k) {
      byPrint.set(fingerprint(r), r);
    } else if (isPendingClaim(r)) {
      const list = pending.get(k) ?? [];
      if (!list.some((x) => x.id === r.id)) list.push(r);
      pending.set(k, list);
    } else {
      // An unverified record never displaces a verified one under the same key (order-independent).
      const prev = byKey.get(k);
      if (prev?.status === 'verified' && r.status !== 'verified') return;
      byKey.set(k, r);
    }
  };
  existing.forEach(index);

  const fresh: PaymentRecord[] = [];
  const duplicates: DuplicateRecord[] = [];
  const merges: ClaimMerge[] = [];
  const conflicts: ConflictRecord[] = [];
  const alerts: ConflictAlert[] = [];
  const possibleDuplicates: PossibleDuplicate[] = [];

  const quarantine = (rec: PaymentRecord, of: PaymentRecord, fields: ConflictField[]): void => {
    conflicts.push({ record: rec, of, fields, kind: 'unverified_conflict' });
  };

  incoming.forEach((rec, i) => {
    const k = dedupeKey(rec);
    const print = k ? null : fingerprint(rec);
    const hit = k ? byKey.get(k) : byPrint.get(print!);
    const claims = k ? (pending.get(k) ?? []) : [];

    if (!hit && claims.length === 0) {
      fresh.push(rec);
      index(rec);
      if (print) batchPrints.add(print);
      return;
    }
    if (hit && print && batchPrints.has(print)) {
      possibleDuplicates.push({ record: rec, of: hit, ordinal: i + 1 });
      return;
    }

    if (hit && k) {
      const fields = conflictFields(rec, hit);
      if (fields.length > 0) {
        if (hit.status === 'verified') {
          const c: ConflictRecord = {
            record: rec,
            of: hit,
            fields,
            kind: 'conflict_with_verified',
          };
          conflicts.push(c);
          alerts.push({
            ...c,
            kind: 'conflict_with_verified',
            ...(rec.source === 'claim' ? { claimId: rec.id } : {}),
            ...(rec.source === 'claim' && rec.claimLeaseId
              ? { claimantLeaseId: rec.claimLeaseId }
              : {}),
          });
        } else quarantine(rec, hit, fields);
      } else duplicates.push({ record: rec, of: hit });
      return;
    }

    if (hit) {
      // Ref-less fingerprint hit.
      if (isPendingClaim(hit) && rec.source !== 'claim') {
        if (isAuthoritative(rec)) {
          const merged: PaymentRecord = { ...rec, id: hit.id };
          merges.push({ merged, claim: hit, otherClaims: [] });
          index(merged);
        } else quarantine(rec, hit, []);
      } else duplicates.push({ record: rec, of: hit });
      return;
    }

    // Keyed record meeting one or more pending claims.
    if (rec.source === 'claim') {
      const clash = claims.find((c) => conflictFields(rec, c).length > 0);
      const same = claims.find((c) => c.claimLeaseId === rec.claimLeaseId);
      if (clash) quarantine(rec, clash, conflictFields(rec, clash));
      else if (same) duplicates.push({ record: rec, of: same });
      else {
        fresh.push(rec);
        index(rec);
      }
      return;
    }
    if (!isAuthoritative(rec)) {
      for (const c of claims) quarantine(rec, c, conflictFields(rec, c));
      return;
    }
    const agreeing = claims.filter((c) => conflictFields(rec, c).length === 0);
    for (const c of claims) {
      const fields = conflictFields(rec, c);
      if (fields.length > 0) {
        conflicts.push({ record: rec, of: c, fields, kind: 'claim_conflict', claimToReject: c.id });
      }
    }
    pending.delete(k!);
    if (agreeing.length > 0) {
      const merged: PaymentRecord = { ...rec, id: agreeing[0]!.id };
      merges.push({ merged, claim: agreeing[0]!, otherClaims: agreeing.slice(1) });
      index(merged);
    } else {
      fresh.push(rec);
      index(rec);
    }
  });
  return { fresh, duplicates, merges, conflicts, alerts, possibleDuplicates };
};
