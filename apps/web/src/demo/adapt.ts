/**
 * Boundary between the shared demo package (bigint KES cents, `@kodibox/demo`) and the web
 * prototype, whose components and queries work on number cents. Convert once here so web
 * components stay unchanged.
 */

/** Recursively turn every bigint into a number (safe: demo amounts are far below 2^53). */
export function toNumbers<T>(value: T): ToNumbers<T> {
  return walk(value) as ToNumbers<T>;
}

export type ToNumbers<T> = T extends bigint
  ? number
  : T extends readonly (infer U)[]
    ? ToNumbers<U>[]
    : T extends object
      ? { [K in keyof T]: ToNumbers<T[K]> }
      : T;

function walk(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(walk);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
  }
  return value;
}
