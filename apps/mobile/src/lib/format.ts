import { format, kes } from '@kodibox/core';

/** Integer KES cents -> "KES 1,234.00" via the shared core formatter. */
export const formatMinor = (amountMinor: bigint): string => format(kes(amountMinor));

/** Same without the currency prefix, for tables where the column says KES. */
export const formatMinorPlain = (amountMinor: bigint): string =>
  formatMinor(amountMinor).replace('KES ', '');

const TZ = 'Africa/Nairobi';

/** Display an instant or date in Africa/Nairobi, e.g. "3 Oct 2026". */
export function formatNairobiDate(iso: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

/** "3 Oct, 14:30" in Africa/Nairobi. */
export function formatNairobiDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso));
}

/** "Mon 2 Nov" in Africa/Nairobi. */
export function formatNairobiWeekday(iso: string): string {
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
    .format(new Date(iso))
    .replace(',', '');
}

/** Whole shillings typed by a user ("14,000") to bigint cents. Returns null when invalid. */
export function parseShillings(input: string): bigint | null {
  const digits = input.replace(/[,\s]/g, '');
  if (!/^\d{1,9}$/.test(digits)) return null;
  return BigInt(digits) * 100n;
}

/** "1 claim", "2 claims". Pass `plural` for irregular nouns ("entry", "entries"). */
export function plural(n: number, singular: string, pluralForm?: string): string {
  return `${n} ${n === 1 ? singular : (pluralForm ?? `${singular}s`)}`;
}

/** Current instant as ISO, for items created in the app. */
export const nowIso = (): string => new Date().toISOString();

/** "Receipt #1043" stays as is; a bare reference such as "1043" becomes "Receipt 1043". */
export const receiptLabel = (reference: string): string =>
  /^receipt\b/i.test(reference) ? reference : `Receipt ${reference}`;

/** "9:42 am" in Africa/Nairobi for the current moment. */
export function nowClock(): string {
  return new Intl.DateTimeFormat('en-KE', {
    timeZone: TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
    .format(new Date())
    .toLowerCase();
}
