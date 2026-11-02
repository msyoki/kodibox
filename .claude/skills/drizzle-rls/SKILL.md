---
name: drizzle-rls
description: Patterns for org-scoped Drizzle tables with Postgres Row-Level Security - table template, RLS policy SQL, the withOrg(orgId, tx => ...) helper using SET LOCAL, DB roles, and testing RLS with Testcontainers. Use when creating or changing any table, migration, or database access code in packages/db.
---
# Drizzle + RLS

Every tenant table has `organization_id` and RLS in the same migration. The app connects as a non-owner role without BYPASSRLS. Forward-only migrations via drizzle-kit; RLS SQL is hand-written in a custom migration (`drizzle-kit generate --custom --name=rls_<table>`) because drizzle's table DSL does not cover everything.

## Table template
```ts
export const leases = pgTable('leases', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  unitId: uuid('unit_id').notNull().references(() => units.id),
  rentMinor: bigint('rent_minor', { mode: 'bigint' }).notNull(),
  currency: text('currency').notNull().default('KES'),
  startsOn: date('starts_on').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index('leases_org_unit_idx').on(t.organizationId, t.unitId),
  check('leases_rent_pos', sql`${t.rentMinor} > 0`),
]);
```
Cross-table FKs should include org to prevent cross-org links: composite `unique(organization_id, id)` on parents and composite FKs `(organization_id, unit_id)` on children.

## RLS migration template
```sql
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases FORCE ROW LEVEL SECURITY;

CREATE POLICY leases_select ON leases FOR SELECT TO kodibox_app
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY leases_insert ON leases FOR INSERT TO kodibox_app
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY leases_update ON leases FOR UPDATE TO kodibox_app
  USING (organization_id = current_setting('app.current_org_id', true)::uuid)
  WITH CHECK (organization_id = current_setting('app.current_org_id', true)::uuid);
CREATE POLICY leases_delete ON leases FOR DELETE TO kodibox_app
  USING (organization_id = current_setting('app.current_org_id', true)::uuid);

GRANT SELECT, INSERT, UPDATE, DELETE ON leases TO kodibox_app;
```
`current_setting(..., true)` returns NULL when unset, so no org context means zero rows (fail closed). Append-only tables (ledger, audit_events): grant only SELECT, INSERT, and add a trigger that raises on UPDATE/DELETE.

Roles: `kodibox_migrator` (owner, runs migrations, never used at runtime); `kodibox_app` (NOLOGIN-inherited or login, no BYPASSRLS, no ownership); `kodibox_platform_admin` is a separate audited connection used only in admin code paths.

## withOrg helper
```ts
export async function withOrg<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  if (!z.string().uuid().safeParse(orgId).success) throw new Error('invalid org id');
  return db.transaction(async (tx) => {
    // set_config(..., true) == SET LOCAL: scoped to this transaction, safe with pooling
    await tx.execute(sql`select set_config('app.current_org_id', ${orgId}, true)`);
    return fn(tx);
  });
}
```
Rules: no queries on the global `db` for tenant tables (lint with a custom ESLint rule or only export `withOrg`); never use session-level `SET`; pgBouncer must use transaction pooling; background jobs carry `orgId` in the payload and call `withOrg` too.

## Testing RLS with Testcontainers
```ts
let container: StartedPostgreSqlContainer;
beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  await migrate(container.getConnectionUri());                 // as owner
  appDb = connectAs('kodibox_app', container);                 // runtime role
}, 120_000);

it('org A cannot see or modify org B leases', async () => {
  const [a, b] = [await seedOrg(), await seedOrg()];
  const leaseB = await withOrg(b, tx => insertLease(tx, b));
  expect(await withOrg(a, tx => tx.select().from(leases).where(eq(leases.id, leaseB.id)))).toHaveLength(0);
  await expect(withOrg(a, tx => insertLease(tx, b))).rejects.toThrow();      // WITH CHECK violation
  const upd = await withOrg(a, tx => tx.update(leases).set({ rentMinor: 1n }).where(eq(leases.id, leaseB.id)).returning());
  expect(upd).toHaveLength(0);
});
it('no org context returns nothing', async () => {
  expect(await appDb.select().from(leases)).toHaveLength(0);
});
```
Add one generic test that iterates `pg_class` for tables with an `organization_id` column and asserts `relrowsecurity AND relforcerowsecurity`, so a forgotten table fails CI.

## Checklist
organization_id NOT NULL + FK; ENABLE+FORCE RLS; 4 policies; grants; org-leading indexes; org-scoped unique keys (e.g. `(organization_id, mpesa_trans_id)`); money as bigint + currency; no destructive change without an expand/contract plan; run `db-migration-reviewer`.
