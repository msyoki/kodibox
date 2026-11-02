import { createDbClient } from '../client';
import { appDatabaseUrl } from '../env';
import { memberships, organizations, users } from '../schema';

/** Demo data only: fictional org and an example.test address; no real PII. Idempotent via fixed IDs. */
export const DEMO_ORG_ID = '019a0000-0000-7000-8000-000000000001';
export const DEMO_OWNER_ID = '019a0000-0000-7000-8000-000000000002';

/** Seeds through the app role and withOrg, so the seed path exercises the same RLS as production. */
export async function seed(url: string): Promise<void> {
  const client = createDbClient(url, { max: 1 });
  try {
    await client.withOrg(DEMO_ORG_ID, async (tx) => {
      await tx
        .insert(organizations)
        .values({ id: DEMO_ORG_ID, name: 'Mwangi Properties' })
        .onConflictDoNothing();
      await tx
        .insert(users)
        .values({ id: DEMO_OWNER_ID, email: 'owner@example.test', displayName: 'Demo Owner' })
        .onConflictDoNothing();
      await tx
        .insert(memberships)
        .values({ organizationId: DEMO_ORG_ID, userId: DEMO_OWNER_ID, role: 'owner' })
        .onConflictDoNothing();
    });
  } finally {
    await client.close();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  await seed(appDatabaseUrl());
  console.log('db:seed complete');
}
