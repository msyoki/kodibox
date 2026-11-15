/** Sliding-window rate limiting. Pure logic over a store interface (Redis in prod, memory in dev/test). */
export interface RateLimitStore {
  /**
   * Records one hit for `key` at `nowMs` and returns the number of hits in the trailing window
   * (including this one) plus the oldest hit's timestamp in the window.
   */
  hit(key: string, windowMs: number, nowMs: number): Promise<{ count: number; oldestMs: number }>;
}

export interface RateLimitRule {
  readonly max: number;
  readonly windowMs: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  remaining: number;
  retryAfterSec: number;
  /** True only on the hit that first exceeds the rule (use to emit one audit counter, not one per attempt). */
  justExceeded: boolean;
}

const MIN = 60_000;
const HOUR = 60 * MIN;

/** SECURITY.md 6.1 / 5.6 limits. Keys are namespaced by the caller (never contain raw PII: hash them). */
export const AUTH_RATE_LIMITS = {
  signInPerAccount: { max: 5, windowMs: 15 * MIN },
  signInPerIp: { max: 20, windowMs: 15 * MIN },
  signUpPerIp: { max: 10, windowMs: HOUR },
  otpSendPerPhone: { max: 3, windowMs: HOUR },
  otpSendPerIp: { max: 20, windowMs: HOUR },
  otpVerifyPerPhone: { max: 5, windowMs: 5 * MIN },
  otpVerifyPerIp: { max: 30, windowMs: 15 * MIN },
  twoFactorPerIp: { max: 20, windowMs: 15 * MIN },
  resetPerAccount: { max: 3, windowMs: HOUR },
  stepUpPerUser: { max: 5, windowMs: 15 * MIN },
} as const satisfies Record<string, RateLimitRule>;

export async function checkRateLimit(
  store: RateLimitStore,
  key: string,
  rule: RateLimitRule,
  nowMs: number = Date.now(),
): Promise<RateLimitDecision> {
  const { count, oldestMs } = await store.hit(key, rule.windowMs, nowMs);
  const allowed = count <= rule.max;
  return {
    allowed,
    remaining: Math.max(0, rule.max - count),
    retryAfterSec: allowed ? 0 : Math.max(1, Math.ceil((oldestMs + rule.windowMs - nowMs) / 1000)),
    justExceeded: count === rule.max + 1,
  };
}

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly hits = new Map<string, number[]>();
  // Hard cap so a key flood cannot exhaust memory in dev.
  constructor(private readonly maxKeys = 50_000) {}

  hit(key: string, windowMs: number, nowMs: number): Promise<{ count: number; oldestMs: number }> {
    const fresh = (this.hits.get(key) ?? []).filter((t) => t > nowMs - windowMs);
    fresh.push(nowMs);
    this.hits.delete(key);
    this.hits.set(key, fresh);
    if (this.hits.size > this.maxKeys) {
      const first = this.hits.keys().next();
      if (!first.done) this.hits.delete(first.value);
    }
    return Promise.resolve({ count: fresh.length, oldestMs: fresh[0] ?? nowMs });
  }
}
