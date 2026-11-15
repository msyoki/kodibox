import { Redis } from 'ioredis';
import { MemoryRateLimitStore, type RateLimitStore } from '@kodibox/core';

/** Scopes where an unavailable store must REFUSE (floods cost money / enable takeover), not degrade. */
const FAIL_CLOSED = /^(otp-send|reset)/;

export interface RedisLike {
  multi(): unknown;
}

/**
 * Redis sliding window (sorted set per key). If Redis errors: OTP-send and reset scopes fail
 * CLOSED (the caller turns the throw into a 429); every other scope degrades to an in-process
 * window so sign-in keeps working. Both paths emit an ALERT log line (no keys, no PII).
 */
export class RedisRateLimitStore implements RateLimitStore {
  private readonly fallback = new MemoryRateLimitStore();
  private lastAlert = 0;
  constructor(private readonly redis: RedisLike) {}

  private alert(closed: boolean): void {
    const t = Date.now();
    if (t - this.lastAlert < 60_000) return;
    this.lastAlert = t;
    console.error(
      closed
        ? 'ALERT rate-limit store unavailable: failing closed'
        : 'ALERT rate-limit store unavailable: degraded to in-process limits',
    );
  }

  async hit(
    key: string,
    windowMs: number,
    nowMs: number,
  ): Promise<{ count: number; oldestMs: number }> {
    const k = `kodibox:rl:${key}`;
    const member = `${nowMs}:${Math.random().toString(36).slice(2, 10)}`;
    try {
      const m = this.redis.multi() as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      const res = (await m
        .zremrangebyscore(k, 0, String(nowMs - windowMs))
        .zadd(k, String(nowMs), member)
        .zcard(k)
        .zrange(k, '0', '0', 'WITHSCORES')
        .pexpire(k, windowMs)
        .exec()) as [Error | null, unknown][] | null;
      // ioredis exec() resolves even when individual commands fail: treat any of them as a store failure.
      if (!res || res.some(([e]) => e)) throw new Error('rate limit command failed');
      const count = Number(res?.[2]?.[1] ?? 1);
      const oldest = res?.[3]?.[1] as string[] | undefined;
      return { count, oldestMs: Number(oldest?.[1] ?? nowMs) };
    } catch {
      const closed = FAIL_CLOSED.test(key);
      this.alert(closed);
      if (closed) throw new Error('rate limit store unavailable');
      return this.fallback.hit(key, windowMs, nowMs);
    }
  }
}

/** Redis when REDIS_URL is set; otherwise in-memory (single instance / dev / tests). */
export function createRateLimitStore(redisUrl: string | undefined): RateLimitStore {
  if (!redisUrl) return new MemoryRateLimitStore();
  const redis = new Redis(redisUrl, {
    lazyConnect: false,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 2000,
  });
  // Never let connection errors crash the process or leak the URL into logs.
  redis.on('error', () => undefined);
  return new RedisRateLimitStore(redis);
}
