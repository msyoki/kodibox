const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-03" or "2026-10-03T08:14:00+03:00" becomes "3 Oct". Timestamps are already Nairobi time. */
export function shortDay(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}`;
}

/** "2026-11-05" becomes "5 Nov 2026". */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''} ${y}`;
}

/** "5 Nov, 14:30" (year added when not 2026). */
export const whenLabel = (iso: string): string => {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${Number(d)} ${MONTHS[Number(m) - 1] ?? ''}${y !== '2026' ? ` ${y}` : ''}, ${iso.slice(11, 16)}`;
};
