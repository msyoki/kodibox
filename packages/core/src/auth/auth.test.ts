import { describe, expect, it } from 'vitest';
import {
  AUTH_RATE_LIMITS,
  GENERIC_AUTH_ERROR,
  MemoryRateLimitStore,
  canSignInWithOtp,
  checkRateLimit,
  evaluateSessionGate,
  isStepUpFresh,
  maskE164,
  normalizeKenyanPhone,
  requiresTwoFactor,
  sanitizeAuthError,
} from './index';

const now = new Date('2026-11-15T10:00:00Z');
const ago = (ms: number) => new Date(now.getTime() - ms);
const MIN = 60_000;
const HOUR = 60 * MIN;

describe('2FA-required roles', () => {
  it('requires TOTP for owner, manager, accountant in any org', () => {
    expect(requiresTwoFactor(['owner'])).toBe(true);
    expect(requiresTwoFactor(['tenant', 'manager'])).toBe(true);
    expect(requiresTwoFactor(['accountant'])).toBe(true);
  });
  it('does not require it for caretaker, tenant, landlord_viewer or no memberships', () => {
    expect(requiresTwoFactor(['caretaker', 'tenant', 'landlord_viewer'])).toBe(false);
    expect(requiresTwoFactor([])).toBe(false);
  });
  it('OTP sign-in is refused for privileged or TOTP-enrolled users', () => {
    expect(canSignInWithOtp(['tenant'], false)).toBe(true);
    expect(canSignInWithOtp(['caretaker'], false)).toBe(true);
    expect(canSignInWithOtp(['manager'], false)).toBe(false);
    expect(canSignInWithOtp(['tenant'], true)).toBe(false);
  });
});

describe('session gate', () => {
  const base = { sessionCreatedAt: ago(MIN), sessionUpdatedAt: ago(MIN), now };
  it('forces enrolment for privileged users without TOTP', () => {
    for (const role of ['owner', 'manager', 'accountant']) {
      expect(evaluateSessionGate({ ...base, roles: [role], twoFactorEnabled: false })).toEqual({
        status: 'enrol_2fa',
      });
    }
  });
  it('passes privileged users once TOTP is enabled', () => {
    expect(evaluateSessionGate({ ...base, roles: ['owner'], twoFactorEnabled: true })).toEqual({
      status: 'ok',
    });
  });
  it('lets tenants and caretakers in without TOTP', () => {
    expect(
      evaluateSessionGate({ ...base, roles: ['tenant'], twoFactorEnabled: false }).status,
    ).toBe('ok');
    expect(evaluateSessionGate({ ...base, roles: [], twoFactorEnabled: false }).status).toBe('ok');
  });
  it('privileged idle timeout is 30 minutes (plus update slack); tenants 12 hours', () => {
    const idle = { sessionCreatedAt: ago(2 * HOUR), sessionUpdatedAt: ago(45 * MIN), now };
    expect(evaluateSessionGate({ ...idle, roles: ['owner'], twoFactorEnabled: true })).toEqual({
      status: 'expired',
      reason: 'idle',
    });
    expect(
      evaluateSessionGate({ ...idle, roles: ['tenant'], twoFactorEnabled: false }).status,
    ).toBe('ok');
  });
  it('absolute lifetime: 12h privileged, 30d others', () => {
    const old = { sessionCreatedAt: ago(13 * HOUR), sessionUpdatedAt: ago(MIN), now };
    expect(evaluateSessionGate({ ...old, roles: ['manager'], twoFactorEnabled: true })).toEqual({
      status: 'expired',
      reason: 'absolute',
    });
    expect(
      evaluateSessionGate({ ...old, roles: ['caretaker'], twoFactorEnabled: false }).status,
    ).toBe('ok');
    const veryOld = { ...old, sessionCreatedAt: ago(31 * 24 * HOUR) };
    expect(
      evaluateSessionGate({ ...veryOld, roles: ['tenant'], twoFactorEnabled: false }).status,
    ).toBe('expired');
  });
});

describe('step-up freshness', () => {
  it('is fresh within 10 minutes only', () => {
    expect(isStepUpFresh(ago(9 * MIN), now)).toBe(true);
    expect(isStepUpFresh(ago(11 * MIN), now)).toBe(false);
    expect(isStepUpFresh(null, now)).toBe(false);
    expect(isStepUpFresh(new Date(now.getTime() + MIN), now)).toBe(false);
  });
});

describe('rate limiting', () => {
  it('allows up to max then blocks with a retry-after, flagging the first excess once', async () => {
    const store = new MemoryRateLimitStore();
    const rule = AUTH_RATE_LIMITS.otpSendPerPhone; // 3 per hour
    const t0 = 1_000_000;
    const d = [];
    for (let i = 0; i < 5; i++) d.push(await checkRateLimit(store, 'otp:+x', rule, t0 + i * 1000));
    expect(d.map((x) => x.allowed)).toEqual([true, true, true, false, false]);
    expect(d.map((x) => x.justExceeded)).toEqual([false, false, false, true, false]);
    expect(d[3]?.retryAfterSec).toBeGreaterThan(3500);
  });
  it('window slides and keys are independent', async () => {
    const store = new MemoryRateLimitStore();
    const rule = AUTH_RATE_LIMITS.signInPerAccount; // 5 / 15 min
    for (let i = 0; i < 6; i++) await checkRateLimit(store, 'a', rule, i);
    expect((await checkRateLimit(store, 'a', rule, 10)).allowed).toBe(false);
    expect((await checkRateLimit(store, 'b', rule, 10)).allowed).toBe(true);
    expect((await checkRateLimit(store, 'a', rule, 16 * MIN)).allowed).toBe(true);
  });
  it('OTP verify attempts are capped', async () => {
    const store = new MemoryRateLimitStore();
    const rule = AUTH_RATE_LIMITS.otpVerifyPerPhone;
    let last = true;
    for (let i = 0; i < 6; i++) last = (await checkRateLimit(store, 'v', rule, i)).allowed;
    expect(last).toBe(false);
  });
});

describe('enumeration-safe errors', () => {
  it('every failed credential/OTP/sign-up response collapses to one generic body', () => {
    const paths = [
      '/sign-in/email',
      '/sign-in/phone-number',
      '/phone-number/verify',
      '/sign-up/email',
      '/two-factor/verify-totp',
    ];
    for (const p of paths) {
      for (const status of [400, 401, 403, 404, 422, 500]) {
        expect(sanitizeAuthError(p, status)).toEqual({ status: 401, body: GENERIC_AUTH_ERROR });
      }
    }
  });
  it('keeps 429 distinct and leaves successes and unrelated paths alone', () => {
    expect(sanitizeAuthError('/sign-in/email', 429)?.status).toBe(429);
    expect(sanitizeAuthError('/sign-in/email', 200)).toBeNull();
    expect(sanitizeAuthError('/get-session', 401)).toBeNull();
  });
});

describe('phone helpers', () => {
  it('normalises Kenyan numbers to E.164', () => {
    for (const raw of [
      '0712 345 678',
      '+254712345678',
      '254712345678',
      '712345678',
      '0712-345-678',
    ])
      expect(normalizeKenyanPhone(raw)).toBe('+254712345678');
    expect(normalizeKenyanPhone('0112345678')).toBe('+254112345678');
  });
  it('rejects invalid numbers', () => {
    for (const raw of ['', 'abc', '0212345678', '+255712345678', '071234567', '07123456789'])
      expect(normalizeKenyanPhone(raw)).toBeNull();
  });
  it('masks', () => {
    expect(maskE164('+254712345678')).toBe('+2547****5678');
  });
});

import { ipRateLimitBucket, resolveClientIp, sessionCookieNames } from './index';

describe('client IP resolution', () => {
  it('ignores forwarded headers with no trusted proxy', () => {
    expect(resolveClientIp('1.2.3.4', 0)).toBeNull();
  });
  it('takes the Nth entry from the right, so client-supplied left entries cannot spoof', () => {
    expect(resolveClientIp('6.6.6.6, 203.0.113.9', 1)).toBe('203.0.113.9');
    expect(resolveClientIp('6.6.6.6, 203.0.113.9, 10.0.0.1', 2)).toBe('203.0.113.9');
    expect(resolveClientIp('203.0.113.9', 2)).toBeNull();
  });
  it('rejects garbage', () => {
    expect(resolveClientIp('not-an-ip', 1)).toBeNull();
    expect(resolveClientIp('999.1.1.1', 1)).toBeNull();
  });
  it('buckets IPv6 by /64 and leaves IPv4 alone', () => {
    expect(ipRateLimitBucket('2001:db8:1:2:aaaa:bbbb:cccc:dddd')).toBe(
      ipRateLimitBucket('2001:db8:1:2::1'),
    );
    expect(ipRateLimitBucket('2001:db8:1:3::1')).not.toBe(ipRateLimitBucket('2001:db8:1:2::1'));
    expect(ipRateLimitBucket('203.0.113.9')).toBe('203.0.113.9');
    expect(ipRateLimitBucket(null)).toBe('unknown');
    expect(resolveClientIp('2001:db8::1', 1)).toBe('2001:db8::1');
  });
});

describe('session cookie names', () => {
  it('accepts only the __Host- cookie in production', () => {
    expect(sessionCookieNames(true)).toEqual(['__Host-kodibox_session']);
    expect(sessionCookieNames(false)).toContain('kodibox.session_token');
  });
});

import {
  CLIENT_IP_HEADER,
  assertControllerIdentityConfigured,
  trustedClientHeaders,
  unconfiguredControllerFields,
} from './index';

describe('trustedClientHeaders', () => {
  it('drops an inbound client-ip header and sets the resolved one', () => {
    const h = new Headers({
      [CLIENT_IP_HEADER]: '1.1.1.1',
      'x-forwarded-for': '6.6.6.6, 203.0.113.9',
    });
    expect(trustedClientHeaders(h, 1).get(CLIENT_IP_HEADER)).toBe('203.0.113.9');
    expect(trustedClientHeaders(h, 0).get(CLIENT_IP_HEADER)).toBeNull(); // no trusted proxy: nothing injected
    expect(h.get(CLIENT_IP_HEADER)).toBe('1.1.1.1'); // input untouched
  });
});

describe('controller identity guard', () => {
  it('flags placeholders and blanks', () => {
    expect(unconfiguredControllerFields({ A: '[X]', B: 'Acme Ltd', C: ' ' })).toEqual(['A', 'C']);
    expect(unconfiguredControllerFields({ A: 'Acme' })).toEqual([]);
  });
  it('blocks production while the shipped placeholders are set, allows development', () => {
    expect(() => assertControllerIdentityConfigured('production')).toThrow(/not configured/);
    expect(() => assertControllerIdentityConfigured('development')).not.toThrow();
  });
});
