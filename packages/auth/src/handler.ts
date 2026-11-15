import { CLIENT_IP_HEADER, sanitizeAuthError, trustedClientHeaders } from '@kodibox/core';
import type { KodiboxAuth } from './config';

const BASE_PATH = '/api/auth';

/**
 * ALLOWLIST of the Better Auth endpoints the product uses. Everything else (password reset by
 * phone, OTP-2FA, update-user, account linking, ...) answers 404 even if a plugin registers it.
 */
const ALLOWED: Record<string, readonly string[]> = {
  GET: ['/get-session', '/verify-email', '/list-sessions'],
  POST: [
    '/sign-in/email',
    '/sign-in/phone-number',
    '/sign-out',
    '/phone-number/send-otp',
    '/phone-number/verify',
    '/two-factor/enable',
    '/two-factor/verify-totp',
    '/two-factor/verify-backup-code',
    '/two-factor/generate-backup-codes',
    '/two-factor/disable',
    '/change-password',
  ],
};
/** Public self-service sign-up stays closed until the onboarding flow exists. */
const SIGN_UP = '/sign-up/email';

export interface AuthRequestOptions {
  /** Number of trusted reverse proxies in front of the app (TRUSTED_PROXY_HOPS). 0 trusts no forwarded header. */
  trustedProxyHops: number;
  allowPublicSignUp?: boolean;
  /**
   * Production: refuse requests whose client IP cannot be resolved (400) instead of sharing one
   * bucket. The origin must ONLY be reachable through the trusted proxy, otherwise X-Forwarded-For
   * is attacker-controlled.
   */
  requireClientIp?: boolean;
}

export function isAllowedAuthRequest(
  method: string,
  path: string,
  opts: AuthRequestOptions,
): boolean {
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path;
  if (p === SIGN_UP) return method === 'POST' && Boolean(opts.allowPublicSignUp);
  return (ALLOWED[method] ?? []).includes(p);
}

const json = (status: number, body: unknown, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...extra },
  });

/**
 * Runs a request through Better Auth: allowlist (404 otherwise), trusted client-IP injection, and
 * the enumeration-safe error policy (every failed credential/OTP/sign-up/reset/2FA response becomes
 * one generic body; 429 stays 429). Success responses and cookies pass through untouched.
 */
export async function handleAuthRequest(
  auth: KodiboxAuth,
  request: Request,
  opts: AuthRequestOptions = { trustedProxyHops: 0 },
): Promise<Response> {
  const { pathname } = new URL(request.url);
  const path = pathname.startsWith(BASE_PATH) ? pathname.slice(BASE_PATH.length) : pathname;
  if (!isAllowedAuthRequest(request.method.toUpperCase(), path, opts)) {
    return json(404, { code: 'NOT_FOUND', message: 'Not found' });
  }

  // Never trust an inbound client-IP header; derive it from X-Forwarded-For using trusted hops.
  const headers = trustedClientHeaders(request.headers, opts.trustedProxyHops);
  if (opts.requireClientIp && !headers.get(CLIENT_IP_HEADER)) {
    return json(400, { code: 'BAD_REQUEST', message: 'Bad request' });
  }
  const res = await auth.handler(new Request(request, { headers }));

  const replacement = sanitizeAuthError(path, res.status);
  if (!replacement) return res;
  const retry = res.headers.get('retry-after');
  return json(replacement.status, replacement.body, retry ? { 'retry-after': retry } : {});
}
