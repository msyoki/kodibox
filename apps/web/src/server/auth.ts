import { serverEnv } from '@kodibox/config';
import { createAuth, createRateLimitStore, type KodiboxAuth } from '@kodibox/auth';
import { getAuthDb } from '@kodibox/db/auth';
import {
  MemoryEmailSink,
  MemoryOtpSink,
  UnconfiguredSender,
  type AuthEmailSender,
  type OtpSender,
} from '@kodibox/integrations';

interface AuthGlobals {
  __kodiboxAuth?: KodiboxAuth;
}
const g = globalThis as AuthGlobals;

/**
 * Process-wide Better Auth instance (survives Next dev HMR). Delivery: dev prints a MASKED number
 * and code to the server console only when NODE_ENV=development; every other environment uses
 * UnconfiguredSender until the SMS/email providers land, so nothing is logged or silently dropped.
 */
export function getAuth(): KodiboxAuth {
  if (g.__kodiboxAuth) return g.__kodiboxAuth;
  const prod = serverEnv.NODE_ENV === 'production';
  const dev = serverEnv.NODE_ENV === 'development';
  const unconfigured = new UnconfiguredSender();
  const otpSender: OtpSender = dev ? new MemoryOtpSink() : unconfigured;
  const emailSender: AuthEmailSender = dev ? new MemoryEmailSink() : unconfigured;
  g.__kodiboxAuth = createAuth({
    db: getAuthDb(),
    secret: serverEnv.AUTH_SECRET,
    baseURL: serverEnv.BETTER_AUTH_URL ?? serverEnv.APP_URL,
    trustedOrigins: serverEnv.AUTH_TRUSTED_ORIGINS?.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    otpSender,
    otpSenderId: serverEnv.AT_SENDER_ID,
    emailSender,
    production: prod,
    allowPlaintextPii: serverEnv.AUTH_ALLOW_PLAINTEXT_PII === '1',
    // Redis sliding window when REDIS_URL works; falls back to in-process memory on Redis errors.
    rateLimitStore: createRateLimitStore(serverEnv.REDIS_URL),
    secureCookies: prod,
    breachedPasswordCheck: serverEnv.AUTH_BREACHED_PASSWORD_CHECK
      ? serverEnv.AUTH_BREACHED_PASSWORD_CHECK === '1'
      : prod,
  });
  return g.__kodiboxAuth;
}

/** Options for handleAuthRequest: trusted proxy hops and whether public sign-up is open. */
export function authRequestOptions() {
  return {
    trustedProxyHops: serverEnv.TRUSTED_PROXY_HOPS ?? 0,
    allowPublicSignUp: serverEnv.AUTH_PUBLIC_SIGNUP === '1',
    // Production: refuse requests with no resolvable client IP. The origin must only be reachable via the proxy.
    requireClientIp: serverEnv.NODE_ENV === 'production',
  };
}
