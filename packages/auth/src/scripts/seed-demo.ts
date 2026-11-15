import { users, accounts, memberships, createAuthDbClient } from '@kodibox/db/auth';
import { createDbClient } from '@kodibox/db/testing';
import { and, eq } from 'drizzle-orm';
import { hashPassword } from '../password';

/**
 * Dev/test only. Gives the demo org (created by `pnpm --filter @kodibox/db db:seed`) four sign-in
 * users. All use the single throwaway password from SEED_DEMO_PASSWORD (never hard-coded):
 *   owner@example.test      owner      password + TOTP (you enrol on first sign-in)
 *   manager@example.test    manager    password + TOTP (enrol on first sign-in)
 *   caretaker@example.test  caretaker  phone +254700000002: SMS OTP, or password
 *   tenant@example.test     tenant     phone +254700000003: SMS OTP, or password
 * Fake phone numbers; no real PII. OTP codes print (masked number) to the web server console in dev.
 */
const DEMO = [
  { email: 'owner@example.test', name: 'Demo Owner', phone: null, role: 'owner' },
  { email: 'manager@example.test', name: 'Demo Manager', phone: '+254700000004', role: 'manager' },
  {
    email: 'caretaker@example.test',
    name: 'Demo Caretaker',
    phone: '+254700000002',
    role: 'caretaker',
  },
  { email: 'tenant@example.test', name: 'Demo Tenant', phone: '+254700000003', role: 'tenant' },
] as const;

export async function seedDemoUsers(
  urls: { auth: string; migrator: string },
  env: Record<string, string | undefined> = process.env,
): Promise<void> {
  if (env.NODE_ENV === 'production')
    throw new Error('seed-demo refuses to run when NODE_ENV=production');
  if (env.ALLOW_DB_SEED !== '1') throw new Error('seed-demo is dev/test only: set ALLOW_DB_SEED=1');
  const password = env.SEED_DEMO_PASSWORD;
  if (!password || password.length < 12)
    throw new Error('Set SEED_DEMO_PASSWORD (12+ characters, dev only)');
  const hash = await hashPassword(password);

  const auth = createAuthDbClient(urls.auth, { max: 2 });
  const migrator = createDbClient(urls.migrator, { max: 1 });
  try {
    const owner = await auth.orm
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, 'owner@example.test'))
      .limit(1);
    const ownerId = owner[0]?.id;
    const [ownerMembership] = ownerId
      ? await auth.orm
          .select({ org: memberships.organizationId })
          .from(memberships)
          .where(and(eq(memberships.userId, ownerId), eq(memberships.role, 'owner')))
          .limit(1)
      : [];
    if (!ownerMembership)
      throw new Error('Demo org not found: run `pnpm --filter @kodibox/db db:seed` first');
    const orgId = ownerMembership.org;

    for (const d of DEMO) {
      let [u] = await auth.orm
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, d.email))
        .limit(1);
      if (!u) {
        [u] = await auth.orm
          .insert(users)
          .values({
            email: d.email,
            displayName: d.name,
            emailVerified: true,
            phoneNumber: d.phone,
          })
          .returning({ id: users.id });
      } else {
        await auth.orm
          .update(users)
          .set({ emailVerified: true, ...(d.phone ? { phoneNumber: d.phone } : {}) })
          .where(eq(users.id, u.id));
      }
      if (!u) throw new Error('seed user missing');
      const [cred] = await auth.orm
        .select({ id: accounts.id })
        .from(accounts)
        .where(and(eq(accounts.userId, u.id), eq(accounts.providerId, 'credential')))
        .limit(1);
      if (!cred)
        await auth.orm
          .insert(accounts)
          .values({ userId: u.id, accountId: u.id, providerId: 'credential', password: hash });
      if (d.role !== 'owner') {
        const userId = u.id;
        await migrator.withOrg(orgId, async (tx) => {
          await tx
            .insert(memberships)
            .values({ organizationId: orgId, userId, role: d.role, status: 'active' })
            .onConflictDoNothing();
        });
      }
    }
  } finally {
    await Promise.all([auth.close(), migrator.close()]);
  }
}

if (process.argv[1]?.endsWith('seed-demo.ts')) {
  const { authDatabaseUrl, migrationDatabaseUrl } = await import('@kodibox/db/env-urls');
  await seedDemoUsers({ auth: authDatabaseUrl(), migrator: migrationDatabaseUrl() });
  console.log(
    'seed-demo complete (users: owner/manager/caretaker/tenant @example.test; password = SEED_DEMO_PASSWORD)',
  );
}
