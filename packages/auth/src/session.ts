import {
  AUTH_RATE_LIMITS,
  checkRateLimit,
  evaluateSessionGate,
  isStepUpFresh,
  STEP_UP_WINDOW_MS,
  type RateLimitStore,
  type SessionGate,
} from '@kodibox/core';
import {
  listActiveRoles,
  recordAuthAudit,
  sessions,
  verifications,
  type AuthDbClient,
} from '@kodibox/db/auth';

import { and, desc, eq, gt, ne } from 'drizzle-orm';
import { CLIENT_IP_HEADER, type KodiboxAuth } from './config';

function auditMeta(headers: Headers) {
  return { ip: headers.get(CLIENT_IP_HEADER), userAgent: headers.get('user-agent') };
}

export interface AuthedSession {
  sessionId: string;
  userId: string;
  /** Display name. Not PII-masked: render server-side only. */
  displayName: string;
  /** Active membership roles across all orgs (E-05 will resolve the current org + role). */
  roles: string[];
  twoFactorEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SessionResolution =
  | { status: 'ok'; session: AuthedSession }
  | { status: 'enrol_2fa'; session: AuthedSession }
  /** Signed in but not an active member of any organization: send to onboarding. */
  | { status: 'no_membership'; session: AuthedSession }
  | { status: 'unauthenticated'; reason: 'none' | 'idle' | 'absolute' };

/**
 * Resolves the session behind a request and applies the gate: 2FA enrolment for owner/manager/
 * accountant, and the privileged idle/absolute limits. Expired sessions are revoked server-side.
 */
export async function resolveSession(
  auth: KodiboxAuth,
  db: AuthDbClient,
  headers: Headers,
  now: Date = new Date(),
): Promise<SessionResolution> {
  // The auth before-hook also enforces the gate and throws for expired/blocked sessions.
  const s = await auth.api.getSession({ headers }).catch(() => null);
  if (!s) return { status: 'unauthenticated', reason: 'none' };
  const roles = await listActiveRoles(db, s.user.id);
  const session: AuthedSession = {
    sessionId: s.session.id,
    userId: s.user.id,
    displayName: s.user.name,
    roles,
    twoFactorEnabled: Boolean(s.user.twoFactorEnabled),
    createdAt: new Date(s.session.createdAt),
    updatedAt: new Date(s.session.updatedAt),
  };
  const gate: SessionGate = evaluateSessionGate({
    roles,
    twoFactorEnabled: session.twoFactorEnabled,
    sessionCreatedAt: session.createdAt,
    sessionUpdatedAt: session.updatedAt,
    now,
  });
  if (gate.status === 'expired') {
    await db.orm.delete(sessions).where(eq(sessions.id, session.sessionId));
    return { status: 'unauthenticated', reason: gate.reason };
  }
  if (roles.length === 0) return { status: 'no_membership', session };
  if (gate.status === 'enrol_2fa') return { status: 'enrol_2fa', session };
  return { status: 'ok', session };
}

/* ---------- step-up (re-auth within 10 minutes) ---------- */

const stepUpId = (sessionId: string) => `stepup:${sessionId}`;

/** Records a successful re-authentication for this session. Call after verifying password/TOTP. */
export async function markSteppedUp(
  db: AuthDbClient,
  s: Pick<AuthedSession, 'sessionId' | 'userId'>,
  now: Date = new Date(),
): Promise<void> {
  await db.orm.insert(verifications).values({
    identifier: stepUpId(s.sessionId),
    value: s.userId,
    expiresAt: new Date(now.getTime() + STEP_UP_WINDOW_MS),
    createdAt: now,
    updatedAt: now,
  });
}

/** True if the session re-authenticated within the window. Use before payout/export/role/2FA changes. */
export async function isSteppedUp(
  db: AuthDbClient,
  s: Pick<AuthedSession, 'sessionId' | 'userId'>,
  now: Date = new Date(),
): Promise<boolean> {
  const rows = await db.orm
    .select({ at: verifications.createdAt })
    .from(verifications)
    .where(
      and(
        eq(verifications.identifier, stepUpId(s.sessionId)),
        eq(verifications.value, s.userId),
        gt(verifications.expiresAt, now),
      ),
    )
    .orderBy(desc(verifications.createdAt))
    .limit(1);
  return isStepUpFresh(rows[0]?.at, now);
}

/**
 * Step-up via password: verifies the current user's password and marks the session. TOTP step-up is
 * a follow-up (needs the twoFactor verify endpoint without a sign-in context).
 */
export async function stepUpWithPassword(
  auth: KodiboxAuth,
  db: AuthDbClient,
  headers: Headers,
  password: string,
  rateLimitStore: RateLimitStore,
): Promise<boolean> {
  const s = await auth.api.getSession({ headers }).catch(() => null);
  if (!s) return false;
  const meta = auditMeta(headers);
  const d = await checkRateLimit(
    rateLimitStore,
    `stepup:${s.user.id}`,
    AUTH_RATE_LIMITS.stepUpPerUser,
  ).catch(() => ({ allowed: false, justExceeded: false }));
  if (!d.allowed) {
    if (d.justExceeded)
      await recordAuthAudit(db, {
        action: 'auth.rate_limited',
        actorUserId: s.user.id,
        ...meta,
        after: { scope: 'step-up' },
      });
    return false;
  }
  const ctx = await auth.$context;
  const cred = await ctx.internalAdapter.findCredentialAccount(s.user.id);
  const valid =
    Boolean(cred?.password) && (await ctx.password.verify({ hash: cred!.password!, password }));
  if (!valid) {
    await recordAuthAudit(db, { action: 'auth.step_up_failed', actorUserId: s.user.id, ...meta });
    return false;
  }
  await markSteppedUp(db, { sessionId: s.session.id, userId: s.user.id });
  await recordAuthAudit(db, { action: 'auth.step_up', actorUserId: s.user.id, ...meta });
  // TODO(follow-up): rotate the session token on step-up (needs a route handler that can set the cookie).
  return true;
}

/* ---------- devices ---------- */

export interface DeviceDto {
  id: string;
  current: boolean;
  userAgent: string | null;
  createdAt: Date;
  lastActiveAt: Date;
}

/** Sessions of the signed-in user (for a "devices" screen). Tokens are never returned. */
export async function listDevices(auth: KodiboxAuth, headers: Headers): Promise<DeviceDto[]> {
  const current = await auth.api.getSession({ headers }).catch(() => null);
  if (!current) return [];
  const list = await auth.api.listSessions({ headers });
  return list.map((x) => ({
    id: x.id,
    current: x.id === current.session.id,
    userAgent: x.userAgent ?? null,
    createdAt: new Date(x.createdAt),
    lastActiveAt: new Date(x.updatedAt),
  }));
}

/** Revokes one of the caller's own sessions by id. Returns false if it is not theirs. */
export async function revokeDevice(
  auth: KodiboxAuth,
  db: AuthDbClient,
  headers: Headers,
  sessionId: string,
): Promise<boolean> {
  const current = await auth.api.getSession({ headers }).catch(() => null);
  if (!current) return false;
  const deleted = await db.orm
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, current.user.id)))
    .returning({ id: sessions.id });
  if (deleted.length > 0) {
    await recordAuthAudit(db, {
      action: 'auth.device_revoked',
      actorUserId: current.user.id,
      ...auditMeta(headers),
      after: { sessionId },
    });
  }
  return deleted.length > 0;
}

/**
 * Revokes every session of the caller except the current one, by session id (Better Auth's
 * revoke-by-token endpoints are not exposed: tokens are hashed at rest). Returns how many were removed.
 */
export async function revokeAllOtherDevices(
  auth: KodiboxAuth,
  db: AuthDbClient,
  headers: Headers,
): Promise<number> {
  const current = await auth.api.getSession({ headers }).catch(() => null);
  if (!current) return 0;
  const deleted = await db.orm
    .delete(sessions)
    .where(and(eq(sessions.userId, current.user.id), ne(sessions.id, current.session.id)))
    .returning({ id: sessions.id });
  await recordAuthAudit(db, {
    action: 'auth.sessions_revoked',
    actorUserId: current.user.id,
    ...auditMeta(headers),
    after: { scope: 'others', count: deleted.length },
  });
  return deleted.length;
}
