import type { KeyedPhoneHasher } from './types';

/** NFKC, upper-case, keep only A-Z0-9. "qft4 ab12cd" -> "QFT4AB12CD". */
export const normaliseExternalRef = (raw: string): string =>
  raw
    .normalize('NFKC')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

/** M-Pesa receipt shape: exactly 10 upper-case alphanumerics (same as the statement parser). */
export const isMpesaReceipt = (ref: string): boolean => /^[A-Z0-9]{10}$/.test(ref);

/**
 * Normalise a payer-typed account reference. "b12", "B 12", "b-12" -> "B-12".
 * Other shapes are NFKC upper-cased with whitespace collapsed.
 */
export const normaliseAccountRef = (raw: string): string => {
  const t = raw.normalize('NFKC').trim().replace(/\s+/g, ' ').toUpperCase();
  const m = /^([A-Z]+)[\s\-_.]*(\d+)$/.exec(t);
  return m ? `${m[1]}-${m[2]}` : t;
};

/** Accepted stored account reference shape. */
export const isValidAccountRef = (ref: string): boolean => /^[A-Z0-9 \-_/]{1,30}$/.test(ref);

/** Alphanumerics only, upper-case: used to compare references. "b-12" -> "B12". */
export const compactRef = (raw: string): string => normaliseExternalRef(raw);

/** Normalise Kenyan numbers to E.164 (+2547XXXXXXXX / +2541XXXXXXXX), or null. */
export const normalisePhone = (raw: string): string | null => {
  const d = raw.replace(/[\s\-().]/g, '').replace(/^\+/, '');
  if (!/^\d+$/.test(d)) return null;
  let national: string;
  if (/^254\d{9}$/.test(d)) national = d.slice(3);
  else if (/^0\d{9}$/.test(d)) national = d.slice(1);
  else if (/^[17]\d{8}$/.test(d)) national = d;
  else return null;
  return /^[17]/.test(national) ? `+254${national}` : null;
};

/** "+254712345678" -> "+2547****5678" (last 4 only, SECURITY.md). For UI/logs only. */
export const maskPhone = (e164: string): string =>
  e164.length < 9 ? '****' : `${e164.slice(0, 5)}****${e164.slice(-4)}`;

export const hashedPhone = (raw: string, hash: KeyedPhoneHasher): string | undefined => {
  const e164 = normalisePhone(raw);
  return e164 ? hash(e164) : undefined;
};

/** Phone-shaped digit run anywhere in free text; non-digit boundaries. */
// Optional single space/dash between groups (0712 345 678, +254-712-345678); bounded and linear.
const PHONE_RUN = /(?<![0-9])(?:\+?254[ -]?|0)?[17][0-9]{2}[ -]?[0-9]{3}[ -]?[0-9]{3}(?![0-9])/g;

/**
 * Mask every phone-shaped digit run in free text (narratives, names, references) and hash the
 * first one. Only the redacted text may be stored.
 */
export const scrubPhones = (
  text: string,
  hash: KeyedPhoneHasher,
): { text: string; phoneHash?: string } => {
  let phoneHash: string | undefined;
  const out = text.replace(PHONE_RUN, (hit) => {
    const e164 = normalisePhone(hit);
    if (!e164) return hit;
    phoneHash ??= hash(e164);
    return maskPhone(e164);
  });
  return phoneHash ? { text: out, phoneHash } : { text: out };
};

/** Remove phone-shaped runs from text (replaced by a space). Returns the phones found (E.164). */
export const stripPhones = (text: string): { text: string; e164: string[] } => {
  const e164: string[] = [];
  const out = text.replace(PHONE_RUN, (hit) => {
    const p = normalisePhone(hit);
    if (!p) return hit;
    e164.push(p);
    return ' ';
  });
  let res = out.replace(/\s+/g, ' ').trim();
  // A phone typed straight after digits ("B120712345678") defeats the digit-boundary lookbehind:
  // peel a valid 12/10/9-digit phone off the end of a trailing digit run (manual scan, linear).
  let run = 0;
  while (run < res.length && /[0-9]/.test(res[res.length - 1 - run]!)) run++;
  if (run >= 9) {
    for (const len of [12, 10, 9]) {
      if (len > run) continue;
      const p = normalisePhone(res.slice(res.length - len));
      if (p) {
        e164.push(p);
        res = res.slice(0, res.length - len).trim();
        break;
      }
    }
  }
  return { text: res, e164 };
};

/** Nairobi is UTC+3 with no DST. Returns ISO UTC or null for impossible dates. */
export const nairobiToUtcIso = (
  y: number,
  mo: number,
  d: number,
  h = 0,
  mi = 0,
  s = 0,
): string | null => {
  if (y < 1970 || y > 2100) return null;
  if (
    mo < 1 ||
    mo > 12 ||
    d < 1 ||
    d > 31 ||
    h < 0 ||
    h > 23 ||
    mi < 0 ||
    mi > 59 ||
    s < 0 ||
    s > 59
  ) {
    return null;
  }
  const probe = new Date(Date.UTC(y, mo - 1, d));
  if (probe.getUTCMonth() !== mo - 1 || probe.getUTCDate() !== d) return null;
  return new Date(Date.UTC(y, mo - 1, d, h - 3, mi, s)).toISOString();
};

/** True when paidAt lies within [now-2y, now+1d]. */
export const withinPaymentWindow = (paidAtIso: string, now: Date): boolean => {
  const t = Date.parse(paidAtIso);
  const twoYears = 2 * 366 * 86_400_000;
  return t >= now.getTime() - twoYears && t <= now.getTime() + 86_400_000;
};

/**
 * Parse "12,000.00", "Ksh 12,000", "1250.5" into minor units. Grouping must be well-formed
 * (^\d{1,3}(,\d{3})+ or plain digits). Null if malformed or integer part exceeds maxIntegerDigits.
 */
export const parseAmountMinor = (raw: string, maxIntegerDigits = 12): bigint | null => {
  const t = raw.trim().replace(/^(?:ksh|kes)\.?[ ]{0,3}/i, '');
  if (t.length > 40) return null;
  const m = /^(-?)(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/.exec(t);
  if (!m) return null;
  const whole = m[2]!.replace(/,/g, '');
  if (whole.length > maxIntegerDigits) return null;
  const minor = BigInt(`${whole}${(m[3] ?? '').padEnd(2, '0')}`);
  return m[1] === '-' ? -minor : minor;
};

/** Leading = + - @ tab or CR can be executed as a formula by spreadsheet software. */
export const isFormulaLike = (text: string): boolean => /^[=+\-@\t\r]/.test(text);

/** Prefix a single quote so spreadsheets treat the cell as text. Use in every CSV/XLSX export. */
export const neutraliseForSpreadsheet = (value: string): string =>
  isFormulaLike(value) ? `'${value}` : value;
