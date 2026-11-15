import { requiresTwoFactor } from './roles';

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Idle timeout / absolute lifetime by privilege (SECURITY.md 6.1). */
export const SESSION_LIMITS = {
  privileged: { idleMs: 30 * MIN, absoluteMs: 12 * HOUR },
  standard: { idleMs: 12 * HOUR, absoluteMs: 30 * 24 * HOUR },
} as const;

/** Better Auth only bumps session.updatedAt every `updateAge`; idle checks allow this slack. */
export const SESSION_UPDATE_AGE_MS = 5 * MIN;

export type SessionGate =
  { status: 'ok' } | { status: 'expired'; reason: 'idle' | 'absolute' } | { status: 'enrol_2fa' };

export interface SessionGateInput {
  /** Active membership roles across all orgs (empty for a user without memberships yet). */
  roles: readonly string[];
  twoFactorEnabled: boolean;
  sessionCreatedAt: Date;
  sessionUpdatedAt: Date;
  now: Date;
}

/**
 * Decides whether a session may reach any (app) route or server action. Deny by default for
 * privileged users until TOTP is enrolled AND verified (twoFactorEnabled flips only after the
 * first valid code). Sign-in itself already forces a TOTP challenge for enrolled users, and OTP
 * sign-in is refused for them, so a live session of an enrolled user has passed the challenge.
 */
export function evaluateSessionGate(input: SessionGateInput): SessionGate {
  const privileged = requiresTwoFactor(input.roles);
  const limits = privileged ? SESSION_LIMITS.privileged : SESSION_LIMITS.standard;
  const now = input.now.getTime();
  if (now - input.sessionCreatedAt.getTime() > limits.absoluteMs)
    return { status: 'expired', reason: 'absolute' };
  if (now - input.sessionUpdatedAt.getTime() > limits.idleMs + SESSION_UPDATE_AGE_MS)
    return { status: 'expired', reason: 'idle' };
  if (privileged && !input.twoFactorEnabled) return { status: 'enrol_2fa' };
  return { status: 'ok' };
}

export const STEP_UP_WINDOW_MS = 10 * MIN;

/** SECURITY.md 6.1: sensitive actions need a password/TOTP re-check within the last 10 minutes. */
export function isStepUpFresh(
  steppedUpAt: Date | null | undefined,
  now: Date,
  windowMs: number = STEP_UP_WINDOW_MS,
): boolean {
  if (!steppedUpAt) return false;
  const age = now.getTime() - steppedUpAt.getTime();
  return age >= 0 && age <= windowMs;
}
