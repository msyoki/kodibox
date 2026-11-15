import { demoSeed } from '@kodibox/demo';
import { describe, expect, it } from 'vitest';
import { flagSavedReadings, mergeReadings } from './readings';

const base = demoSeed.meterReadings.filter((m) => m.propertyId === 'prop_mvule');
const pending = base.filter((m) => m.status === 'pending');

describe('mergeReadings', () => {
  it('turns a saved pending reading into a recorded one', () => {
    const p = pending[0]!;
    const merged = mergeReadings(base, { [p.id]: p.previous + 10 }, 'Caretaker');
    expect(merged.filter((m) => m.status !== 'pending')).toHaveLength(
      base.filter((m) => m.status !== 'pending').length + 1,
    );
    expect(merged.find((m) => m.id === p.id)?.current).toBe(p.previous + 10);
  });
});

describe('flagSavedReadings', () => {
  it('flags a huge jump and not a normal one', () => {
    const [a, b] = pending;
    const flagged = flagSavedReadings(
      demoSeed,
      base,
      { [a!.id]: a!.previous + 90, [b!.id]: b!.previous + 10 },
      'Mvule',
    );
    expect(flagged.map((f) => f.used)).toEqual([90]);
  });
});
