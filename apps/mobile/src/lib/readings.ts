import type { DemoData, MeterReading, UnusualReading } from '@kodibox/demo';

/** Meter readings with the caretaker's saves applied, so the manager sees them straight away. */
export function mergeReadings(
  base: readonly MeterReading[],
  done: Record<string, number>,
  recordedBy: string,
): MeterReading[] {
  return base.map((m) =>
    m.id in done && m.status === 'pending'
      ? { ...m, current: done[m.id] ?? m.current, status: 'recorded' as const, recordedBy }
      : m,
  );
}

const median = (xs: number[]): number => {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? (s[mid] ?? 0) : ((s[mid - 1] ?? 0) + (s[mid] ?? 0)) / 2;
};

/**
 * Readings just saved by the caretaker that look unusual: at least 3x and 20 units above the
 * median use of the readings that were already in. Same "check before invoicing" idea as the seed flag.
 */
export function flagSavedReadings(
  data: DemoData,
  base: readonly MeterReading[],
  done: Record<string, number>,
  propertyName: string,
): UnusualReading[] {
  const usual = Math.round(
    median(
      base
        .filter((m) => m.status !== 'pending' && m.current !== null)
        .map((m) => (m.current ?? m.previous) - m.previous),
    ),
  );
  const out: UnusualReading[] = [];
  for (const m of base) {
    const value = done[m.id];
    if (value === undefined || m.status !== 'pending') continue;
    const used = value - m.previous;
    if (used >= 20 && used >= usual * 3) {
      out.push({
        id: `rd-${m.id}`,
        unit: data.units.find((u) => u.id === m.unitId)?.code ?? m.unitId,
        property: propertyName,
        used,
        usual,
      });
    }
  }
  return out;
}
