/** Kenyan mobile numbers in E.164: +2547XXXXXXXX or +2541XXXXXXXX. */
const KE_E164 = /^\+254[71]\d{8}$/;

export const isKenyanE164 = (value: string): boolean => KE_E164.test(value.trim());

/** Accepts 07XX XXX XXX, 254... and +254..., returns E.164, or null when it is not a Kenyan mobile. */
export function toKenyanE164(input: string): string | null {
  const compact = input.replace(/[\s-]/g, '');
  const e164 = /^0[71]\d{8}$/.test(compact)
    ? `+254${compact.slice(1)}`
    : /^254[71]\d{8}$/.test(compact)
      ? `+${compact}`
      : compact;
  return KE_E164.test(e164) ? e164 : null;
}

/** SECURITY.md mask for display and logs: +2547****5678 (network prefix and last 4 digits). */
export function maskPhone(e164: string): string {
  if (!KE_E164.test(e164)) return '****';
  return `${e164.slice(0, 5)}****${e164.slice(-4)}`;
}
