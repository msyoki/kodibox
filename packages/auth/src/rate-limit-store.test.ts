import { afterEach, describe, expect, it, vi } from 'vitest';
import { RedisRateLimitStore } from './rate-limit-store';

const brokenRedis = {
  multi() {
    const chain: Record<string, unknown> = {};
    for (const m of ['zremrangebyscore', 'zadd', 'zcard', 'zrange', 'pexpire'])
      chain[m] = () => chain;
    chain.exec = () => Promise.reject(new Error('ECONNREFUSED'));
    return chain;
  },
};

const partlyFailing = {
  multi() {
    const chain: Record<string, unknown> = {};
    for (const m of ['zremrangebyscore', 'zadd', 'zcard', 'zrange', 'pexpire'])
      chain[m] = () => chain;
    chain.exec = () =>
      Promise.resolve([
        [null, 0],
        [new Error('OOM command not allowed'), null],
        [null, 1],
        [null, []],
        [null, 1],
      ]);
    return chain;
  },
};

describe('RedisRateLimitStore when Redis is down', () => {
  afterEach(() => vi.restoreAllMocks());

  it('fails CLOSED for OTP-send and reset scopes and logs an alert without keys', async () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = new RedisRateLimitStore(brokenRedis);
    await expect(store.hit('otp-send-phone:abc', 60_000, Date.now())).rejects.toThrow();
    await expect(store.hit('reset-acct:abc', 60_000, Date.now())).rejects.toThrow();
    expect(err).toHaveBeenCalledTimes(1); // alert is throttled to one per minute
    expect(String(err.mock.calls[0]?.[0])).toMatch(/^ALERT rate-limit store unavailable/);
    expect(String(err.mock.calls[0]?.[0])).not.toContain('abc');
  });

  it('treats a per-command error inside a resolved exec() as a store failure (fail closed for OTP-send)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = new RedisRateLimitStore(partlyFailing);
    await expect(store.hit('otp-send-phone:abc', 60_000, Date.now())).rejects.toThrow();
    await expect(store.hit('reset-ip:abc', 60_000, Date.now())).rejects.toThrow();
    expect((await store.hit('signin-acct:abc', 60_000, 5)).count).toBe(1); // other scopes degrade
  });

  it('degrades to in-process limits for other scopes (sign-in keeps working)', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const store = new RedisRateLimitStore(brokenRedis);
    const a = await store.hit('signin-acct:x', 60_000, 1000);
    const b = await store.hit('signin-acct:x', 60_000, 2000);
    expect([a.count, b.count]).toEqual([1, 2]);
  });
});
