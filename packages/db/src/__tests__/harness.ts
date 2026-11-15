import { spawnSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { bootstrapRoles, createDbClient, runMigrations, type DbClient } from '../internal';

export function dockerAvailable(): boolean {
  try {
    return spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 60_000 }).status === 0;
  } catch {
    return false;
  }
}

export const SKIP_REASON = 'Docker is not available: skipping Testcontainers integration tests';

// Throwaway credentials for ephemeral test containers only.
const MIGRATOR_PW = 'tc-migrator-pw';
const APP_PW = 'tc-app-pw';
const AUTH_PW = 'tc-auth-pw';

export interface TestDb {
  container: StartedPostgreSqlContainer;
  adminUrl: string;
  migratorUrl: string;
  appUrl: string;
  authUrl: string;
  admin: DbClient;
  migrator: DbClient;
  app: DbClient;
  stop(): Promise<void>;
}

function urlFor(c: StartedPostgreSqlContainer, user: string, pw: string): string {
  return `postgres://${user}:${pw}@${c.getHost()}:${c.getPort()}/${c.getDatabase()}`;
}

export async function startTestDb(): Promise<TestDb> {
  const container = await new PostgreSqlContainer('postgres:16-alpine').start();
  const adminUrl = container.getConnectionUri();
  await bootstrapRoles(adminUrl, { migrator: MIGRATOR_PW, app: APP_PW, auth: AUTH_PW });
  const migratorUrl = urlFor(container, 'kodibox_migrator', MIGRATOR_PW);
  const appUrl = urlFor(container, 'kodibox_app', APP_PW);
  const authUrl = urlFor(container, 'kodibox_auth', AUTH_PW);
  await runMigrations(migratorUrl);
  const admin = createDbClient(adminUrl, { max: 2 });
  const migrator = createDbClient(migratorUrl, { max: 2 });
  const app = createDbClient(appUrl, { max: 1 }); // single connection: proves GUC non-leakage
  return {
    container,
    adminUrl,
    migratorUrl,
    appUrl,
    authUrl,
    admin,
    migrator,
    app,
    async stop() {
      await Promise.all([admin.close(), migrator.close(), app.close()]);
      await container.stop();
    },
  };
}
