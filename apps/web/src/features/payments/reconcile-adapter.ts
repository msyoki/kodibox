/**
 * The only file in apps/web that calls the @kodibox/core reconciliation engine. Keeping the calls
 * here means engine API changes (required keyed phone hasher, source-scoped candidates, conflicts,
 * stripped raw lines) are absorbed in one place. Semantics the UI relies on:
 * - an unverified claim is never credited because match() is confident; it only becomes a
 *   payment when a statement line merges into it or a manager approves it;
 * - raw lines and raw phones are never displayed or logged.
 */
import {
  allocate,
  createKeyedPhoneHasher,
  maskPhone,
  neutraliseForSpreadsheet,
  normalisePhone,
  parseBankCsv,
  parseMpesaSms,
  parseMpesaStatementCsv,
  reconcile,
  toPaymentRecord,
  type BankCsvMapping,
  type MatchCandidate,
  type ParsedLine,
  type PaymentRecord,
  type ReconcileResult,
} from '@kodibox/core';

export { BANK_DATE_FORMATS } from '@kodibox/core';
export { allocate, maskPhone, neutraliseForSpreadsheet, normalisePhone };
export type {
  BankCsvMapping,
  MatchCandidate,
  ParsedLine,
  PaymentRecord,
  ReconcileResult,
  RowError,
  ParseOutput,
} from '@kodibox/core';

/** Input caps (mirrors the engine): friendly errors before parsing. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_SMS_CHARS = 1000;

/**
 * Demo hasher: HMAC-SHA256 with an ephemeral random 32-byte key generated once per process.
 * Production servers must derive the key from KMS (versioned) per ADR 0007.
 */
export const demoHashPhone = createKeyedPhoneHasher(
  globalThis.crypto.getRandomValues(new Uint8Array(32)),
  'demo-ephemeral',
);

export const parseMpesaStatement = (text: string) =>
  parseMpesaStatementCsv(text, { hashPhone: demoHashPhone, now: new Date() });

export const parseBankStatement = (text: string, mapping: BankCsvMapping) =>
  parseBankCsv(text, mapping, { hashPhone: demoHashPhone, now: new Date() });

export const parseSms = (text: string, expectedPayees: readonly string[] = []) =>
  text.length > MAX_SMS_CHARS
    ? ({
        ok: false,
        error: { code: 'too_long', message: 'That message is too long to be an M-Pesa SMS.' },
      } as const)
    : parseMpesaSms(text, { now: new Date(), expectedPayees });

export const toRecord = toPaymentRecord;

/** Attach the payment source ids a candidate may receive money from (engine scopes by source). */
export const toCandidate = (
  base: Omit<MatchCandidate, 'paymentSourceIds'>,
  paymentSourceIds: readonly string[],
): MatchCandidate => ({ ...base, paymentSourceIds });

export type ReconcileSummary = ReconcileResult;

export const runReconcile = (
  batch: readonly PaymentRecord[],
  existing: readonly PaymentRecord[],
  candidates: readonly MatchCandidate[],
): ReconcileSummary => reconcile(batch, { existing, candidates });

/** Masked payer phone from a parsed line's raw text, display only. Undefined when unavailable. */
export const maskedPhoneOf = (line: ParsedLine): string | undefined => {
  const raw = (line as { rawLine?: string }).rawLine;
  const m = raw ? /\b(\+?254[17]\d{8})\b/.exec(raw) : null;
  const e164 = m?.[1] ? normalisePhone(m[1]) : null;
  return e164 ? maskPhone(e164) : undefined;
};
