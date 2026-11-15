import { sumMinor, type DemoData } from '@kodibox/demo';

export interface PropertyStats {
  units: number;
  occupied: number;
  vacant: number;
  /** One decimal place, same rule as the web dashboard. */
  occupancyPct: number;
}

const pct1 = (part: number, whole: number): number =>
  whole === 0 ? 0 : Math.round((part / whole) * 1000) / 10;

/** Unit counts for one property (or the whole portfolio when `propertyId` is omitted). Vacant means status vacant. */
export function propertyStats(data: DemoData, propertyId?: string): PropertyStats {
  const units = data.units.filter((u) => !propertyId || u.propertyId === propertyId);
  const vacant = units.filter((u) => u.status === 'vacant').length;
  const occupied = units.length - vacant;
  return { units: units.length, occupied, vacant, occupancyPct: pct1(occupied, units.length) };
}

export interface ArrearsBucket {
  label: string;
  amount: bigint;
  count: number;
}

const BUCKETS = ['0-30 days', '31-60 days', '61-90 days', 'Over 90 days'] as const;

/** Open invoice balances grouped by age, as the web dashboard does. */
export function arrearsAging(data: DemoData): ArrearsBucket[] {
  const open = data.invoices.filter((i) => i.balance > 0n);
  return BUCKETS.map((label, idx) => {
    const inB = open.filter((i) => {
      const d = i.oldestUnpaidDays;
      const b = d <= 30 ? 0 : d <= 60 ? 1 : d <= 90 ? 2 : 3;
      return b === idx;
    });
    return { label, amount: sumMinor(inB.map((i) => i.balance)), count: inB.length };
  });
}

export const totalArrears = (data: DemoData): bigint =>
  sumMinor(data.invoices.filter((i) => i.balance > 0n).map((i) => i.balance));
