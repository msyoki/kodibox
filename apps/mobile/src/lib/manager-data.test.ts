import { demoSeed, getCollection, shillings } from '@kodibox/demo';
import { describe, expect, it } from 'vitest';
import { arrearsAging, propertyStats, totalArrears } from './manager-data';

describe('manager data', () => {
  it('matches the web dashboard collection totals', () => {
    const c = getCollection(demoSeed);
    expect(c.expected).toBe(shillings(1_284_000));
    expect(c.collected).toBe(shillings(1_032_500));
  });

  it('counts units across the portfolio', () => {
    const s = propertyStats(demoSeed);
    expect(s.units).toBe(150);
    expect(s.occupied + s.vacant).toBe(s.units);
  });

  it('aging buckets sum to total arrears', () => {
    const sum = arrearsAging(demoSeed).reduce((a, b) => a + b.amount, 0n);
    expect(sum).toBe(totalArrears(demoSeed));
  });
});
