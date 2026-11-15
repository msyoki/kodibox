import { normaliseAccountRef, normaliseExternalRef } from './normalize';
import type {
  ParsedLine,
  PaymentRecord,
  PaymentRecordStatus,
  PaymentSource,
  RawLine,
  SourceKind,
} from './types';

type Ctx = {
  id: string;
  source: PaymentSource;
  sourceAccountId: string;
  /** Defaults to the parser's kind. Use 'cash' or 'manual' for manual entries. */
  sourceKind?: SourceKind;
  /** Claims: the lease the claimant says this payment is for. */
  claimLeaseId?: string;
  /** Defaults: import verified; claim and manual unverified (approval/maker-checker required). */
  status?: PaymentRecordStatus;
};

/**
 * Attach identity and provenance to a parsed line. Claims start unverified. The raw line is NOT
 * part of the record; use toPaymentRecordWithRaw to get it for encrypted storage.
 */
export const toPaymentRecord = (line: ParsedLine, ctx: Ctx): PaymentRecord => {
  const ref = line.externalRef ? normaliseExternalRef(line.externalRef) : '';
  return {
    id: ctx.id,
    source: ctx.source,
    sourceKind: ctx.sourceKind ?? line.sourceKind,
    sourceAccountId: ctx.sourceAccountId,
    ...(ctx.claimLeaseId ? { claimLeaseId: ctx.claimLeaseId } : {}),
    ...(ref ? { externalRef: ref } : {}),
    amount: line.amount,
    currency: line.currency,
    paidAt: line.paidAt,
    ...(line.payerName ? { payerName: line.payerName } : {}),
    ...(line.payerPhoneHash ? { payerPhoneHash: line.payerPhoneHash } : {}),
    ...(line.accountRef ? { accountRef: normaliseAccountRef(line.accountRef) } : {}),
    status: ctx.status ?? (ctx.source === 'import' ? 'verified' : 'unverified'),
  };
};

/** Record plus its raw line, to be encrypted and stored separately (keyed by record id). */
export const toPaymentRecordWithRaw = (
  line: ParsedLine,
  ctx: Ctx,
): { record: PaymentRecord; rawLine: RawLine } => ({
  record: toPaymentRecord(line, ctx),
  rawLine: line.rawLine,
});

/** Collect raw lines by record id for encrypted persistence. */
export const rawLinesById = (
  entries: readonly { record: PaymentRecord; rawLine: RawLine }[],
): Map<string, RawLine> => new Map(entries.map((e) => [e.record.id, e.rawLine]));
