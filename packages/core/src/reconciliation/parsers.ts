import { appError, err, ok, type AppError, type Result } from '../result';
import { headerKey, parseCsv, type CsvRow } from './csv';
import {
  hashedPhone,
  isFormulaLike,
  isValidAccountRef,
  nairobiToUtcIso,
  normaliseAccountRef,
  normaliseExternalRef,
  parseAmountMinor,
  scrubPhones,
  stripPhones,
  withinPaymentWindow,
} from './normalize';
import type {
  KeyedPhoneHasher,
  ParsedLine,
  ParseOptions,
  ParseOutput,
  RawLine,
  RowError,
  SmsParseOptions,
} from './types';

/** Row errors carry a code and row number only. Never echo cell content (may be PII). */
const MESSAGES: Record<string, string> = {
  missing_receipt: 'Row has no transaction reference.',
  invalid_receipt: 'Transaction reference has an unexpected format.',
  invalid_amount: 'Amount is not valid.',
  invalid_date: 'Date is not valid.',
  date_out_of_range: 'Date is outside the accepted range.',
  invalid_account_ref: 'Account reference has an unexpected format.',
  invalid_reference: 'Reference has an unexpected format.',
  short_row: 'Row has fewer columns than the header.',
};
const rowError = (row: number, code: string): RowError => ({
  row,
  code,
  message: MESSAGES[code] ?? 'Row could not be read.',
});

const asRaw = (s: string): RawLine => s as RawLine;

const MPESA_TIME_ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;
const MPESA_TIME_DMY = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

/** "2026-03-11 09:14:02" or "11-03-2026 09:14:02" / "11/03/2026 09:14" (Nairobi local) -> ISO UTC. */
const parseMpesaTime = (raw: string): string | null => {
  const t = raw.trim();
  let m = MPESA_TIME_ISO.exec(t);
  if (m) return nairobiToUtcIso(+m[1]!, +m[2]!, +m[3]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  m = MPESA_TIME_DMY.exec(t);
  if (m) return nairobiToUtcIso(+m[3]!, +m[2]!, +m[1]!, +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0));
  return null;
};

/** Bounded, linear: caller trims the value; cell length is capped by the CSV reader. */
const OTHER_PARTY = /^(\+?[\d*]{9,15})[ ]{0,3}-[ ]{0,3}(\S.{0,99})$/;

/** Last "Acc" in the details text, then a bounded account token. Linear, no nested quantifiers. */
const accountFromDetails = (details: string): string => {
  const at = details.toLowerCase().lastIndexOf('acc');
  if (at < 0) return '';
  let rest = details.slice(at + 3);
  rest = rest.replace(/^ount/i, '').replace(/^\./, '').trimStart();
  if (/^no\.?\s/i.test(rest)) rest = rest.replace(/^no\.?/i, '').trimStart();
  rest = rest.replace(/^:/, '').trim();
  return /^[A-Za-z0-9][A-Za-z0-9\-_ ]{0,29}$/.test(rest) ? rest : '';
};

const MPESA_REQUIRED = ['receiptno', 'completiontime', 'transactionstatus', 'paidin'] as const;

const headerRowIndex = (rows: CsvRow[], required: readonly string[]): number =>
  rows.findIndex((r) => {
    const keys = r.cells.map(headerKey);
    return required.every((k) => keys.includes(k));
  });

/**
 * Account reference cell -> normalised ref and/or a phone hash. Phone numbers anywhere in the value
 * are hashed (first one) and stripped from the ref, which is dropped when no digit remains
 * ("B 0712345678" -> no ref). A bare phone is never stored raw.
 */
const resolveAccountRef = (
  raw: string,
  hash: KeyedPhoneHasher,
): { ref?: string; phoneHash?: string; error?: string } => {
  if (raw === '') return {};
  const { text, e164 } = stripPhones(raw);
  const phoneHash = e164[0] ? hash(e164[0]) : undefined;
  const base = phoneHash ? { phoneHash } : {};
  if (e164.length > 0 && !/[0-9]/.test(text)) return base;
  if (text === '') return base;
  const ref = normaliseAccountRef(text);
  return isValidAccountRef(ref) ? { ...base, ref } : { ...base, error: 'invalid_account_ref' };
};

const flagsFor = (...texts: (string | undefined)[]): readonly string[] =>
  texts.some((t) => t !== undefined && isFormulaLike(t)) ? ['formula_like'] : [];

/**
 * Parse an M-Pesa business-portal statement CSV. Only Completed rows with Paid In > 0 become
 * lines. Malformed rows go to rowErrors (code + row number only); never throws. Returns err for
 * a missing header or a malformed/oversize file (fails closed).
 */
export const parseMpesaStatementCsv = (
  text: string,
  options: ParseOptions,
): Result<ParseOutput, AppError> => {
  const parsed = parseCsv(text);
  if (!parsed.ok) return parsed;
  const rows = parsed.value;
  const headerIdx = headerRowIndex(rows, MPESA_REQUIRED);
  if (headerIdx < 0) {
    return err(
      appError('statement_header_not_found', 'Could not find the M-Pesa statement header columns.'),
    );
  }
  const col = new Map<string, number>();
  rows[headerIdx]!.cells.forEach((h, i) => {
    if (!col.has(headerKey(h))) col.set(headerKey(h), i);
  });
  const get = (cells: string[], key: string): string => {
    const i = col.get(key);
    return i === undefined ? '' : (cells[i] ?? '').trim();
  };

  const lines: ParsedLine[] = [];
  const rowErrors: RowError[] = [];
  let skipped = 0;

  for (const r of rows.slice(headerIdx + 1)) {
    const receipt = normaliseExternalRef(get(r.cells, 'receiptno'));
    if (!receipt) {
      rowErrors.push(rowError(r.line, 'missing_receipt'));
      continue;
    }
    if (get(r.cells, 'transactionstatus').toLowerCase() !== 'completed') {
      skipped++;
      continue;
    }
    const paidInRaw = get(r.cells, 'paidin');
    if (paidInRaw === '') {
      skipped++;
      continue;
    }
    if (!/^[A-Z0-9]{10}$/.test(receipt)) {
      rowErrors.push(rowError(r.line, 'invalid_receipt'));
      continue;
    }
    const amount = parseAmountMinor(paidInRaw, options.maxIntegerDigits);
    if (amount === null) {
      rowErrors.push(rowError(r.line, 'invalid_amount'));
      continue;
    }
    if (amount <= 0n) {
      skipped++;
      continue;
    }
    const paidAt = parseMpesaTime(get(r.cells, 'completiontime'));
    if (!paidAt) {
      rowErrors.push(rowError(r.line, 'invalid_date'));
      continue;
    }
    if (!withinPaymentWindow(paidAt, options.now)) {
      rowErrors.push(rowError(r.line, 'date_out_of_range'));
      continue;
    }

    const party = OTHER_PARTY.exec(get(r.cells, 'otherpartyinfo'));
    const accCell = get(r.cells, 'acno');
    const acc = resolveAccountRef(
      accCell || accountFromDetails(get(r.cells, 'details')),
      options.hashPhone,
    );
    if (acc.error && accCell) {
      rowErrors.push(rowError(r.line, acc.error));
      continue;
    }
    const scrubbedName = party?.[2] ? scrubPhones(party[2], options.hashPhone) : undefined;
    const phoneHash =
      (party?.[1] ? hashedPhone(party[1], options.hashPhone) : undefined) ??
      scrubbedName?.phoneHash ??
      acc.phoneHash;
    const name = scrubbedName?.text.toUpperCase();
    const flags = flagsFor(name, accCell);

    lines.push({
      row: r.line,
      sourceKind: 'mpesa',
      externalRef: receipt,
      amount,
      currency: 'KES',
      paidAt,
      ...(name ? { payerName: name } : {}),
      ...(phoneHash ? { payerPhoneHash: phoneHash } : {}),
      ...(acc.ref ? { accountRef: acc.ref } : {}),
      ...(flags.length ? { flags } : {}),
      rawLine: asRaw(r.raw),
    });
  }
  return ok({ lines, rowErrors, skipped });
};

/** Allowlisted date layouts. No caller-supplied pattern ever reaches a RegExp. */
export const BANK_DATE_FORMATS = [
  'DD/MM/YYYY',
  'D/M/YYYY',
  'YYYY-MM-DD',
  'DD-MM-YYYY',
  'MM/DD/YYYY',
  'DD.MM.YYYY',
] as const;
export type BankDateFormat = (typeof BANK_DATE_FORMATS)[number];

export type BankCsvMapping = {
  /** Column header names (matched case-insensitively, punctuation ignored). */
  readonly date: string;
  /** Single signed amount column (positive = credit)... */
  readonly amount?: string;
  /** ...or separate credit/debit columns. Only credits are imported. */
  readonly credit?: string;
  readonly debit?: string;
  readonly reference: string;
  readonly description?: string;
  /** Optional column holding the payer-typed account reference. */
  readonly accountRef?: string;
  readonly dateFormat: BankDateFormat;
};

type DateLayout = { re: RegExp; order: readonly ('d' | 'm' | 'y')[] };
const LAYOUTS: Record<BankDateFormat, DateLayout> = {
  'DD/MM/YYYY': { re: /^(\d{2})\/(\d{2})\/(\d{4})$/, order: ['d', 'm', 'y'] },
  'D/M/YYYY': { re: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, order: ['d', 'm', 'y'] },
  'YYYY-MM-DD': { re: /^(\d{4})-(\d{2})-(\d{2})$/, order: ['y', 'm', 'd'] },
  'DD-MM-YYYY': { re: /^(\d{2})-(\d{2})-(\d{4})$/, order: ['d', 'm', 'y'] },
  'MM/DD/YYYY': { re: /^(\d{2})\/(\d{2})\/(\d{4})$/, order: ['m', 'd', 'y'] },
  'DD.MM.YYYY': { re: /^(\d{2})\.(\d{2})\.(\d{4})$/, order: ['d', 'm', 'y'] },
};

const parseByFormat = (raw: string, format: BankDateFormat): string | null => {
  const layout = LAYOUTS[format];
  const m = layout.re.exec(raw.trim());
  if (!m) return null;
  const v = { d: 0, m: 0, y: 0 };
  layout.order.forEach((k, i) => {
    v[k] = Number(m[i + 1]);
  });
  // Bank dates carry no time: use 12:00 Nairobi so the calendar day is stable in UTC.
  return nairobiToUtcIso(v.y, v.m, v.d, 12);
};

/**
 * Generic bank statement CSV using a column mapping. Only credits become lines. Phone numbers in
 * the narrative or account reference are hashed into payerPhoneHash and masked in the text.
 */
export const parseBankCsv = (
  text: string,
  mapping: BankCsvMapping,
  options: ParseOptions,
): Result<ParseOutput, AppError> => {
  if (!mapping.amount && !mapping.credit) {
    return err(appError('invalid_mapping', 'Mapping needs an amount or a credit column.'));
  }
  if (!(BANK_DATE_FORMATS as readonly string[]).includes(mapping.dateFormat)) {
    return err(appError('invalid_mapping', 'Unsupported date format.'));
  }
  const parsed = parseCsv(text);
  if (!parsed.ok) return parsed;
  const rows = parsed.value;
  const need = [mapping.date, mapping.amount ?? mapping.credit!, mapping.reference].map(headerKey);
  const headerIdx = headerRowIndex(rows, need);
  if (headerIdx < 0) {
    return err(
      appError('statement_header_not_found', 'Mapped columns were not found in the file.'),
    );
  }
  const keys = rows[headerIdx]!.cells.map(headerKey);
  const idx = (name?: string): number => (name ? keys.indexOf(headerKey(name)) : -1);
  const iDate = idx(mapping.date);
  const iAmount = idx(mapping.amount);
  const iCredit = idx(mapping.credit);
  const iRef = idx(mapping.reference);
  const iDesc = idx(mapping.description);
  const iAcc = idx(mapping.accountRef);
  const cell = (cells: string[], i: number): string => (i < 0 ? '' : (cells[i] ?? '').trim());

  const lines: ParsedLine[] = [];
  const rowErrors: RowError[] = [];
  let skipped = 0;

  for (const r of rows.slice(headerIdx + 1)) {
    const amountRaw = iAmount >= 0 ? cell(r.cells, iAmount) : cell(r.cells, iCredit);
    if (amountRaw === '') {
      skipped++;
      continue;
    }
    const amount = parseAmountMinor(amountRaw, options.maxIntegerDigits);
    if (amount === null) {
      rowErrors.push(rowError(r.line, 'invalid_amount'));
      continue;
    }
    if (amount <= 0n) {
      skipped++;
      continue;
    }
    const paidAt = parseByFormat(cell(r.cells, iDate), mapping.dateFormat);
    if (!paidAt) {
      rowErrors.push(rowError(r.line, 'invalid_date'));
      continue;
    }
    if (!withinPaymentWindow(paidAt, options.now)) {
      rowErrors.push(rowError(r.line, 'date_out_of_range'));
      continue;
    }
    const refRaw = cell(r.cells, iRef);
    // A phone-shaped reference is not a usable reference: hash the phone, treat as no-ref.
    const refScrub = scrubPhones(refRaw, options.hashPhone);
    const refIsPhone = refScrub.phoneHash !== undefined;
    const ref = refIsPhone ? '' : normaliseExternalRef(refRaw);
    if (!refIsPhone && refRaw !== '' && (ref.length < 4 || ref.length > 40)) {
      rowErrors.push(rowError(r.line, 'invalid_reference'));
      continue;
    }
    const accCell = cell(r.cells, iAcc);
    const acc = resolveAccountRef(accCell, options.hashPhone);
    if (acc.error) {
      rowErrors.push(rowError(r.line, acc.error));
      continue;
    }
    const descRaw = cell(r.cells, iDesc);
    const scrubbed = scrubPhones(descRaw, options.hashPhone);
    const name = scrubbed.text.toUpperCase();
    const phoneHash = scrubbed.phoneHash ?? acc.phoneHash ?? refScrub.phoneHash;
    const flags = flagsFor(descRaw, accCell);
    lines.push({
      row: r.line,
      sourceKind: 'bank',
      ...(ref ? { externalRef: ref } : {}),
      amount,
      currency: 'KES',
      paidAt,
      ...(name ? { payerName: name } : {}),
      ...(phoneHash ? { payerPhoneHash: phoneHash } : {}),
      ...(acc.ref ? { accountRef: acc.ref } : {}),
      ...(flags.length ? { flags } : {}),
      rawLine: asRaw(r.raw),
    });
  }
  return ok({ lines, rowErrors, skipped });
};

const SMS_MAX_CHARS = 1000;
const SMS_HEAD = '^([A-Z0-9]{10}) confirmed\\.? (?:ksh|kes)\\.? ?([\\d,]{1,20}(?:\\.\\d{1,2})?)';
const SMS_WHEN = 'on (\\d{1,2})/(\\d{1,2})/(\\d{2,4}) at (\\d{1,2}):(\\d{2}) ?([AP]M)';
// Bounded classes: payee and account cannot contain '.', so the lazy parts cannot backtrack across the message.
const PAYBILL_SMS = new RegExp(
  `${SMS_HEAD} sent to ([^.]{1,100}?) for account ([^.]{1,30}?) ${SMS_WHEN}`,
  'i',
);
const TILL_SMS = new RegExp(`${SMS_HEAD} paid to ([^.]{1,100}?)\\.? ${SMS_WHEN}`, 'i');

const compactName = (s: string): string =>
  s
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

/**
 * Parse a pasted M-Pesa confirmation SMS (paybill "sent to ... for account", or till "paid to").
 * Rejects text over 1,000 characters before any regex runs. Returns one line; no payer fields.
 * With expectedPayees, sets payeeMismatch when the payee is not one of them.
 */
export const parseMpesaSms = (
  text: string,
  options: SmsParseOptions,
): Result<ParseOutput, AppError> => {
  if (text.length > SMS_MAX_CHARS) {
    return err(appError('sms_too_long', 'Message is too long.'));
  }
  const t = text.replace(/\s+/g, ' ').trim();
  const m = PAYBILL_SMS.exec(t) ?? TILL_SMS.exec(t);
  if (!m) {
    return err(
      appError('sms_unrecognised', 'This does not look like an M-Pesa confirmation message.'),
    );
  }
  const isPaybill = m.length === 11;
  const code = normaliseExternalRef(m[1]!);
  if (!/^[A-Z0-9]{10}$/.test(code) || !/\d/.test(code) || !/[A-Z]/.test(code)) {
    return err(appError('sms_unrecognised', 'Transaction code is not valid.'));
  }
  const amount = parseAmountMinor(m[2]!);
  if (amount === null || amount <= 0n) {
    return err(appError('invalid_amount', 'Amount is not valid.'));
  }
  const o = isPaybill ? 5 : 4;
  const clock = Number(m[o + 3]);
  if (clock < 1 || clock > 12) return err(appError('invalid_date', 'Date is not valid.'));
  let year = Number(m[o + 2]);
  if (m[o + 2]!.length === 2) year += 2000;
  const pm = m[o + 5]!.toUpperCase() === 'PM';
  const hour = (clock % 12) + (pm ? 12 : 0);
  const paidAt = nairobiToUtcIso(year, Number(m[o + 1]), Number(m[o]), hour, Number(m[o + 4]));
  if (!paidAt) return err(appError('invalid_date', 'Date is not valid.'));
  if (!withinPaymentWindow(paidAt, options.now)) {
    return err(appError('date_out_of_range', 'Date is outside the accepted range.'));
  }
  let accountRef: string | undefined;
  if (isPaybill) {
    // Phones typed into the account field are stripped (no hasher here); a ref with no digit left is dropped.
    const { text, e164 } = stripPhones(m[4]!.trim());
    if (text !== '' && !(e164.length > 0 && !/[0-9]/.test(text))) {
      const ref = normaliseAccountRef(text);
      if (!isValidAccountRef(ref))
        return err(appError('invalid_account_ref', 'Account reference is not valid.'));
      accountRef = ref;
    }
  }
  const payee = m[3]!.trim().toUpperCase();
  const flags = flagsFor(m[3], m[4]);
  const line: ParsedLine = {
    row: 1,
    sourceKind: 'mpesa',
    externalRef: code,
    amount,
    currency: 'KES',
    paidAt,
    payee,
    ...(accountRef ? { accountRef } : {}),
    ...(flags.length ? { flags } : {}),
    rawLine: asRaw(t),
  };
  const expected = options.expectedPayees?.map(compactName);
  return ok({
    lines: [line],
    rowErrors: [],
    skipped: 0,
    ...(expected ? { payeeMismatch: !expected.includes(compactName(payee)) } : {}),
  });
};
