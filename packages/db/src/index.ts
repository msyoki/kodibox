import { createDbClient, type DbClient, type Tx } from './client';
import { appDatabaseUrl } from './env';

export const PACKAGE = '@kodibox/db' as const;

export * from './schema';
export type { Tx, Database, DbClient } from './client';

let singleton: DbClient | undefined;
function client(): DbClient {
  singleton ??= createDbClient(appDatabaseUrl());
  return singleton;
}

/**
 * Run `fn` in a transaction scoped to one organization (RLS context set via SET LOCAL semantics).
 * This is the ONLY way application code reaches org-scoped tables.
 */
export function withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return client().withOrg(orgId, fn);
}

/**
 * Audited cross-org access. Not implemented until E-05/E-06 (needs a kodibox_platform_admin
 * connection plus a mandatory audit_events write). Rejects so no caller can rely on it yet.
 */
export function withPlatformAdmin<T>(
  _reason: string,
  _actorId: string,
  _fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  void [_reason, _actorId, _fn];
  return Promise.reject(new Error('NotImplemented: withPlatformAdmin lands in E-05/E-06'));
}

/**
 * Facade, deliberately NOT a Drizzle instance: it exposes no query builder, so org-scoped
 * queries are impossible without going through withOrg. The raw client (`createDbClient`,
 * from '@kodibox/db/internal') is for migrations, seeds and tests only; ESLint forbids
 * importing it outside packages/db.
 */
export const db = {
  withOrg,
  withPlatformAdmin,
  async close(): Promise<void> {
    await singleton?.close();
    singleton = undefined;
  },
} as const;
