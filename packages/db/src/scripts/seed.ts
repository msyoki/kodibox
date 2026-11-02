import { sql } from 'drizzle-orm';
import postgres from 'postgres';
import { createDbClient } from '../client';
import { appDatabaseUrl, migrationDatabaseUrl } from '../env';

/** Demo data only: fictional org and an example.test address; no real PII. */
const DEMO_OWNER_EMAIL = 'owner@example.test';
const PLACEHOLDER_ORG = '019a0000-0000-7000-8000-0000000000ff'; // create_organization ignores the context org

/**
 * Dev/test only (refuses when NODE_ENV=production). The app role cannot create users or orgs
 * directly, so the seed uses two connections:
 *  1. kodibox_migrator (MIGRATION_DATABASE_URL) inserts the demo owner user. This is the
 *     "migrator-only path": users has a migrator policy for it and the app role has no INSERT.
 *  2. kodibox_app calls create_organization() as that user, which atomically creates the org and an
 *     ACTIVE owner membership, exercising the same RLS and functions as production.
 * Idempotency marker is the demo user: if the user already exists (from a previous seed, or under
 * any id) the seed assumes it ran and does nothing. Delete the user to re-seed.
 */
export async function seed(
  urls: { app: string; migrator: string },
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  if (env.NODE_ENV === 'production')
    throw new Error('db:seed refuses to run when NODE_ENV=production');
  const migrator = postgres(urls.migrator, { max: 1, onnotice: () => undefined });
  let ownerId: string;
  try {
    const rows = await migrator<{ id: string }[]>`
      insert into users (email, display_name) values (${DEMO_OWNER_EMAIL}, 'Demo Owner')
      on conflict (email) do nothing returning id`;
    if (!rows[0]) return; // user already exists: already seeded
    ownerId = rows[0].id;
  } finally {
    await migrator.end({ timeout: 5 });
  }
  const client = createDbClient(urls.app, { max: 1 });
  try {
    await client.withOrg(
      PLACEHOLDER_ORG,
      (tx) => tx.execute(sql`select create_organization('Mwangi Properties')`),
      { userId: ownerId },
    );
  } finally {
    await client.close();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  await seed({ app: appDatabaseUrl(), migrator: migrationDatabaseUrl() });
  console.log('db:seed complete');
}
