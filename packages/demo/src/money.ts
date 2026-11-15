import { add, kes, zero } from '@kodibox/core';

/** Whole shillings to bigint KES cents. Fixture authoring helper only. */
export const shillings = (n: number): bigint => BigInt(n) * 100n;

/** Sum minor-unit amounts through the core money helpers. */
export const sumMinor = (values: readonly bigint[]): bigint =>
  values.reduce((total, v) => add(total, kes(v)), zero()).amountMinor;
