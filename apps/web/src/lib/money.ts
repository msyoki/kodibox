/** Format integer minor units (cents of KES) for display. Demo-only helper; real code uses packages/core. */
export function formatKes(minor: bigint | number, opts: { prefix?: boolean } = {}): string {
  const { prefix = true } = opts;
  const total = typeof minor === 'bigint' ? minor : BigInt(Math.round(minor));
  const negative = total < 0n;
  const abs = negative ? -total : total;
  const shillings = abs / 100n;
  const cents = abs % 100n;
  const whole = shillings.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const body = cents === 0n ? whole : `${whole}.${cents.toString().padStart(2, '0')}`;
  return `${prefix ? 'KES ' : ''}${negative ? '-' : ''}${body}`;
}

/** Whole shillings to minor units (cents). */
export const kes = (shillings: number): number => Math.round(shillings * 100);
