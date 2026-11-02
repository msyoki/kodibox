import { sql } from 'drizzle-orm';
import { createDbClient } from '../client';
import { appDatabaseUrl } from '../env';
import { memberships, organizations } from '../schema';

/** Demo data only: fictional org and an example.test address; no real PII. Idempotent via fixed IDs. */
export const DEMO_ORG_ID = '019a0000-0000-7000-8000-000000000001';
const DEMO_OWNER_EMAIL = 'owner@example.test';

/**
 * Seeds through the app role and withOrg, so the seed path exercises the same RLS as production.
 * Users and memberships go through the SECURITY DEFINER functions; if the demo email already exists
 * under another id, that id is reused.
 */
export async function seed(
  url: string,
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  if (env.NODE_ENV === 'production')
    throw new Error('db:seed refuses to run when NODE_ENV=production');
  const client = createDbClient(url, { max: 1 });
  try {
    await client.withOrg(DEMO_ORG_ID, (tx) =>
      tx
        .insert(organizations)
        .values({ id: DEMO_ORG_ID, name: 'Mwangi Properties' })
        .onConflictDoNothing(),
    );
    const existing = await client.withOrg(DEMO_ORG_ID, (tx) =>
      tx.select({ id: memberships.id }).from(memberships).limit(1),
    );
    if (existing.length > 0) return; // already seeded
    const ownerId = await client.withOrg(DEMO_ORG_ID, async (tx) => {
      const rows = await tx.execute<{ id: string }>(
        sql`select create_or_get_user_for_invite(${DEMO_OWNER_EMAIL}, ${'Demo Owner'}) as id`,
      );
      const id = rows[0]?.id;
      if (!id) throw new Error('seed: could not resolve demo owner');
      return id;
    });
    await client.withOrg(
      DEMO_ORG_ID,
      (tx) =>
        tx.execute(sql`select add_membership(${DEMO_ORG_ID}::uuid, ${ownerId}::uuid, 'owner')`),
      { userId: ownerId },
    );
  } finally {
    await client.close();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  await seed(appDatabaseUrl());
  console.log('db:seed complete');
}
