import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../internal';
import { auditEvents, memberships, organizations, users } from '../schema';
import { dockerAvailable, SKIP_REASON, startTestDb, type TestDb } from './harness';

const hasDocker = dockerAvailable();
if (!hasDocker) console.warn(`[db tests] ${SKIP_REASON}`);

const ORG_A = '019a1000-0000-7000-8000-00000000000a';
const ORG_B = '019a1000-0000-7000-8000-00000000000b';
const USER_A = '019a1000-0000-7000-8000-0000000000a1';
const USER_B = '019a1000-0000-7000-8000-0000000000b1';

describe.skipIf(!hasDocker)('migrations + RLS (Testcontainers postgres:16-alpine)', () => {
  let t: TestDb;

  beforeAll(async () => {
    t = await startTestDb();
    for (const [org, user, name] of [
      [ORG_A, USER_A, 'orga'],
      [ORG_B, USER_B, 'orgb'],
    ] as const) {
      await t.app.withOrg(org, async (tx) => {
        await tx.insert(organizations).values({ id: org, name: `Org ${name}` });
        await tx
          .insert(users)
          .values({ id: user, email: `${name}@example.test`, displayName: `Owner ${name}` });
        await tx.insert(memberships).values({ organizationId: org, userId: user, role: 'owner' });
        await tx.insert(auditEvents).values({
          organizationId: org,
          actorUserId: user,
          action: 'org.create',
          entityType: 'organization',
          entityId: org,
        });
      });
    }
  });

  afterAll(async () => {
    await t?.stop();
  });

  it('migrations applied and are re-runnable', async () => {
    await expect(runMigrations(t.migratorUrl)).resolves.toBeUndefined();
    const rows = await t.migrator.sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
    expect(rows[0]?.n).toBe(3);
  });

  it('app role is not a superuser, not BYPASSRLS, and owns nothing', async () => {
    const [r] = await t.admin
      .sql`select rolsuper, rolbypassrls from pg_roles where rolname = 'kodibox_app'`;
    expect(r).toEqual({ rolsuper: false, rolbypassrls: false });
    const owned = await t.admin
      .sql`select tablename from pg_tables where schemaname = 'public' and tableowner = 'kodibox_app'`;
    expect(owned).toHaveLength(0);
  });

  it('every org-scoped table (and baseline global tables) has ENABLE + FORCE RLS', async () => {
    const rows = await t.admin.sql<
      { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]
    >`
      select c.relname, c.relrowsecurity, c.relforcerowsecurity
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
        and (c.relname in ('organizations', 'users')
             or exists (select 1 from pg_attribute a
                        where a.attrelid = c.oid and a.attname = 'organization_id' and not a.attisdropped))`;
    expect(rows.map((r) => r.relname).sort()).toEqual([
      'audit_events',
      'memberships',
      'organizations',
      'users',
    ]);
    for (const r of rows) {
      expect(r.relrowsecurity, r.relname).toBe(true);
      expect(r.relforcerowsecurity, r.relname).toBe(true);
    }
  });

  it('org A cannot see org B rows inside withOrg(A)', async () => {
    await t.app.withOrg(ORG_A, async (tx) => {
      expect((await tx.select().from(organizations)).map((o) => o.id)).toEqual([ORG_A]);
      expect((await tx.select().from(memberships)).map((m) => m.organizationId)).toEqual([ORG_A]);
      expect((await tx.select().from(auditEvents)).map((e) => e.organizationId)).toEqual([ORG_A]);
      expect((await tx.select().from(users)).map((u) => u.id)).toEqual([USER_A]);
    });
  });

  it('org A cannot insert or update rows for org B', async () => {
    await expect(
      t.app.withOrg(ORG_A, (tx) =>
        tx.insert(memberships).values({ organizationId: ORG_B, userId: USER_A, role: 'manager' }),
      ),
    ).rejects.toThrow();
    const upd = await t.app.withOrg(ORG_A, (tx) =>
      tx.update(organizations).set({ name: 'renamed' }).returning(),
    );
    expect(upd.map((o) => o.id)).toEqual([ORG_A]); // org B untouched
    const [b] = await t.admin.sql`select name from organizations where id = ${ORG_B}`;
    expect(b?.name).toBe('Org orgb');
    await expect(
      t.app.withOrg(ORG_A, (tx) =>
        tx.insert(auditEvents).values({ organizationId: ORG_B, action: 'x', entityType: 'x' }),
      ),
    ).rejects.toThrow();
  });

  it('with no org set, org-scoped selects return 0 rows (fail closed)', async () => {
    for (const table of ['organizations', 'memberships', 'audit_events', 'users']) {
      const rows = await t.app.sql.unsafe(`select 1 from ${table}`);
      expect(rows, table).toHaveLength(0);
    }
  });

  it('set_config is transaction-local and does not leak across pooled connections', async () => {
    // The app client has a single pooled connection, so the next query reuses the same session.
    await t.app.withOrg(ORG_A, async (tx) => {
      const [r] = await tx.execute(sql`select current_setting('app.current_org_id', true) as v`);
      expect(r?.v).toBe(ORG_A);
    });
    const [after] = await t.app
      .sql`select nullif(current_setting('app.current_org_id', true), '') as v`;
    expect(after?.v).toBeNull();
    expect(await t.app.sql`select 1 from memberships`).toHaveLength(0);
  });

  it('withOrg rejects non-UUID org ids', async () => {
    await expect(t.app.withOrg('not-a-uuid; drop table users', async () => 1)).rejects.toThrow(
      'invalid organization id',
    );
  });

  it('app role cannot UPDATE, DELETE or TRUNCATE audit_events', async () => {
    await expect(
      t.app.withOrg(ORG_A, (tx) => tx.update(auditEvents).set({ action: 'tampered' })),
    ).rejects.toThrow();
    await expect(t.app.withOrg(ORG_A, (tx) => tx.delete(auditEvents))).rejects.toThrow();
    await expect(t.app.sql`truncate audit_events`).rejects.toThrow();
    const [row] = await t.admin
      .sql`select count(*)::int as n from audit_events where action = 'tampered'`;
    expect(row?.n).toBe(0);
  });

  it('even a superuser bypassing RLS cannot mutate audit_events (trigger)', async () => {
    await expect(t.admin.sql`update audit_events set action = 'x'`).rejects.toThrow(/append-only/);
    await expect(t.admin.sql`delete from audit_events`).rejects.toThrow(/append-only/);
  });

  it('app role cannot bypass RLS or escalate', async () => {
    await expect(
      t.app.sql.unsafe('alter table memberships disable row level security'),
    ).rejects.toThrow();
    await expect(t.app.sql.unsafe('create policy p on memberships using (true)')).rejects.toThrow();
    await expect(t.app.sql.unsafe('set role kodibox_migrator')).rejects.toThrow();
    await expect(t.app.sql.unsafe('create table public.evil (id int)')).rejects.toThrow();
    // row_security = off makes Postgres raise instead of bypassing for a non-BYPASSRLS role.
    await t.app.sql.unsafe('set row_security = off');
    await expect(t.app.sql`select 1 from memberships`).rejects.toThrow(/row-level security/);
    await t.app.sql.unsafe('reset row_security');
  });
});
