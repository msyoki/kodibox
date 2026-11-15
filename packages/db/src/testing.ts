/**
 * Raw database access for TESTS and DEV-ONLY SCRIPTS outside packages/db (e.g. the auth package's
 * Testcontainers suite and the demo seed). App and runtime code must use withOrg() from
 * @kodibox/db or the auth client from @kodibox/db/auth; these clients bypass org scoping.
 *
 * Refuses to load in production so it can never back a deployed code path.
 */
const nodeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
  ?.env?.NODE_ENV;
if (nodeEnv === 'production') {
  throw new Error(
    '@kodibox/db/testing is for tests and dev scripts only and must not load in production',
  );
}

export { createDbClient } from './client';
export type { DbClient } from './client';
export { runMigrations, MIGRATIONS_FOLDER } from './scripts/migrate';
export { bootstrapRoles } from './scripts/bootstrap';
