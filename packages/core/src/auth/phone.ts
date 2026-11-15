/**
 * Normalises a Kenyan mobile number to E.164 (+2547XXXXXXXX / +2541XXXXXXXX). Returns null if it
 * is not one. Accepts 07.., 01.., 7.., 254.., +254.., with spaces, dashes or dots.
 */
export function normalizeKenyanPhone(raw: string): string | null {
  const s = raw.trim().replace(/[\s\-.()]/g, '');
  if (!/^\+?\d+$/.test(s)) return null;
  let digits = s.startsWith('+') ? s.slice(1) : s;
  if (digits.startsWith('254')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return /^[17]\d{8}$/.test(digits) ? `+254${digits}` : null;
}

export function isE164Kenyan(value: string): boolean {
  return /^\+254[17]\d{8}$/.test(value);
}

/** +254712345678 -> +2547****5678. For logs and UI only. */
export function maskE164(e164: string): string {
  return e164.length < 8 ? '****' : `${e164.slice(0, 5)}****${e164.slice(-4)}`;
}
