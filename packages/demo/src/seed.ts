import { DEMO_ORG_ID, DEMO_TODAY, rawSeed } from './seed-build';
import type { DemoData } from './types';

export { DEMO_ORG_ID, DEMO_TODAY };

/** Fields that hold money. Everything else numeric (counts, meter units, percentages) stays a number. */
const MONEY_KEYS: ReadonlySet<string> = new Set([
  'priceMonthly',
  'rent',
  'serviceCharge',
  'deposit',
  'amount',
  'total',
  'paid',
  'balance',
  'ratePerUnit',
  'gross',
  'commission',
  'expenses',
  'net',
]);

function toMinor(value: unknown, key?: string): unknown {
  if (Array.isArray(value)) return value.map((v) => toMinor(v));
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toMinor(v, k)]));
  }
  if (typeof value === 'number' && key !== undefined && MONEY_KEYS.has(key)) {
    if (!Number.isSafeInteger(value)) throw new Error(`Money field ${key} is not an integer`);
    return BigInt(value);
  }
  return value;
}

/** The full demo dataset. Money is bigint KES cents. Treat as read-only; clone before mutating. */
export const demoSeed: DemoData = toMinor(rawSeed) as DemoData;
