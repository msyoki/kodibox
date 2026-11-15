import { appError, err, ok, type AppError, type Result } from '@kodibox/core';
import {
  isSteppedUp,
  resolveSession,
  type AuthedSession,
  type SessionResolution,
} from '@kodibox/auth';
import { getAuthDb } from '@kodibox/db/auth';
import { serverEnv } from '@kodibox/config';
import { trustedClientHeaders } from '@kodibox/core';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { getAuth } from './auth';

/**
 * Request headers for auth helpers: any inbound client-ip header is dropped and the trusted one is
 * derived from X-Forwarded-For + TRUSTED_PROXY_HOPS (same helper as the auth route handler).
 */
export async function trustedRequestHeaders(): Promise<Headers> {
  return trustedClientHeaders(await headers(), serverEnv.TRUSTED_PROXY_HOPS ?? 0);
}

/** Resolved once per request. Applies the 2FA-enrolment gate and privileged idle/absolute limits. */
export const getSession = cache(async (): Promise<SessionResolution> => {
  return resolveSession(getAuth(), getAuthDb(), await trustedRequestHeaders());
});

/**
 * For pages, layouts and route handlers: redirects to /login (no session) or to the TOTP
 * enrolment screen (owner/manager/accountant without TOTP). Never returns an unverified session.
 * E-05 will extend the result with the current organization and role.
 */
export async function requireSession(): Promise<AuthedSession> {
  const r = await getSession();
  if (r.status === 'ok') return r.session;
  if (r.status === 'enrol_2fa') redirect('/login/2fa-setup');
  if (r.status === 'no_membership') redirect('/onboarding');
  redirect('/login');
}

/** For Server Actions: returns Result instead of redirecting/throwing. Combine with can() (E-05). */
export async function requireSessionResult(): Promise<Result<AuthedSession, AppError>> {
  const r = await getSession();
  if (r.status === 'ok') return ok(r.session);
  if (r.status === 'enrol_2fa')
    return err(appError('two_factor_required', 'Set up two-factor authentication to continue.'));
  if (r.status === 'no_membership')
    return err(appError('no_membership', 'Join or create an organization to continue.'));
  return err(appError('unauthenticated', 'Please sign in.'));
}

/**
 * Step-up guard for sensitive actions (payout settings, exports, role changes, 2FA/phone change).
 * Returns an error Result unless the session re-authenticated within the last 10 minutes
 * (see stepUpWithPassword in @kodibox/auth).
 */
export async function requireStepUp(session: AuthedSession): Promise<Result<true, AppError>> {
  return (await isSteppedUp(getAuthDb(), session))
    ? ok(true)
    : err(appError('step_up_required', 'Confirm your password to continue.'));
}
