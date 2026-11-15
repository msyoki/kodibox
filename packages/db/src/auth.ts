import { and, eq } from 'drizzle-orm';
import { createDbClient, type DbClient } from './client';
import { authDatabaseUrl } from './env';
import { auditEvents, memberships, users, type MembershipRole } from './schema';

/**
 * Entry point for the Better Auth server ONLY (packages/auth). It connects as role kodibox_auth,
 * the only role with access to credential tables (accounts, sessions, verifications, two_factors).
 * Never use it for org-scoped data; kodibox_auth has no grants there.
 */
export type AuthDbClient = DbClient;

export function createAuthDbClient(url: string, options: { max?: number } = {}): AuthDbClient {
  return createDbClient(url, options);
}

let singleton: AuthDbClient | undefined;
export function getAuthDb(): AuthDbClient {
  singleton ??= createAuthDbClient(authDatabaseUrl());
  return singleton;
}

export { users, sessions, accounts, verifications, twoFactors } from './schema';

export interface AuthAuditInput {
  action: string;
  actorUserId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  /** Already free of PII (counts, method names, role names). Never phone, email, codes, tokens. */
  after?: Record<string, unknown> | null;
}

/**
 * Append-only platform-level audit row for auth events (organization_id IS NULL; enforced by the
 * kodibox_auth insert policy). Does not RETURN (the auth role has no SELECT on audit_events).
 */
export async function recordAuthAudit(db: AuthDbClient, input: AuthAuditInput): Promise<void> {
  const ip = input.ip && /^[0-9a-fA-F:.]+$/.test(input.ip) ? input.ip : null;
  await db.orm.insert(auditEvents).values({
    organizationId: null,
    actorUserId: input.actorUserId ?? null,
    action: input.action,
    entityType: 'auth',
    entityId: input.actorUserId ?? null,
    after: input.after ?? null,
    ip,
    userAgent: input.userAgent ? input.userAgent.slice(0, 200) : null,
  });
}

/** Active membership roles of a user across ALL orgs (kodibox_auth has read-only access). */
export async function listActiveRoles(db: AuthDbClient, userId: string): Promise<MembershipRole[]> {
  const rows = await db.orm
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.userId, userId), eq(memberships.status, 'active')));
  return rows.map((r) => r.role);
}

/** Existence probe used by the OTP gate (no PII returned). */
export async function findUserIdByPhone(db: AuthDbClient, phone: string): Promise<string | null> {
  const rows = await db.orm
    .select({ id: users.id })
    .from(users)
    .where(eq(users.phoneNumber, phone))
    .limit(1);
  return rows[0]?.id ?? null;
}

export { memberships } from './schema';
