import { DEMO_TODAY } from './seed';
import type { PaymentChannel } from './types';

export const CHANNEL_LABEL: Record<PaymentChannel, string> = {
  mpesa_paybill: 'M-Pesa paybill',
  mpesa_stk: 'M-Pesa paybill',
  bank: 'Bank',
  cash: 'Cash',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-05" becomes "5 Nov 2026". Timestamps are already Africa/Nairobi in the demo data. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''} ${y}`;
}

/** Today's timestamps show the clock time, yesterday's show "Yesterday", older ones the date. */
export function formatWhen(iso: string): string {
  const day = iso.slice(0, 10);
  if (day === DEMO_TODAY) return iso.slice(11, 16);
  if (day === '2026-11-01') return 'Yesterday';
  return formatDate(day);
}
