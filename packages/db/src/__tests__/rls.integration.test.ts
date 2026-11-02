import { eq, sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runMigrations } from '../internal';
import { auditEvents, memberships, organizations, users } from '../schema';
import { dockerAvailable, SKIP_REASON, startTestDb, type TestDb } from './harness';

/** Drizzle wraps driver errors ("Failed query"); the Postgres text is on error.cause. */
function pgMatches(re: RegExp) {
  return (e: unknown): boolean => {
    const err = e as { message?: string; cause?: { message?: string } };
    return re.test(`${err.message ?? ''} ${err.cause?.message ?? ''}`);
  };
}

const hasDocker = dockerAvailable();
if (!hasDocker) console.warn(`[db tests] ${SKIP_REASON}`);

const ORG_A = '019a1000-0000-7000-8000-00000000000a';
const ORG_B = '019a1000-0000-7000-8000-00000000000b';
const USER_A = '019a1000-0000-7000-8000-0000000000a1';
const USER_B = '019a1000-0000-7000-8000-0000000000b1';
const USER_C = '019a1000-0000-7000-8000-0000000000c1'; // active caretaker in A
const USER_M = '019a1000-0000-7000-8000-0000000000d1'; // active manager in A

describe.skipIf(!hasDocker)('migrations + RLS (Testcontainers postgres:16-alpine)', () => {
  let t: TestDb;

  async function addMembership(
    tx: Parameters<Parameters<TestDb['app']['withOrg']>[1]>[0],
    org: string,
    user: string,
    role: string,
  ): Promise<string> {
    const rows = await tx.execute<{ id: string }>(
      sql`select add_membership(${org}::uuid, ${user}::uuid, ${role}::membership_role) as id`,
    );
    return rows[0]!.id;
  }

  function createUser(org: string, email: string, name: string, asUser?: string) {
    return t.app.withOrg(
      org,
      async (tx) => {
        const rows = await tx.execute<{ id: string }>(
          sql`select create_or_get_user_for_invite(${email}, ${name}) as id`,
        );
        return rows[0]!.id;
      },
      asUser ? { userId: asUser } : undefined,
    );
  }

  beforeAll(async () => {
    t = await startTestDb();
    // Fixture users with fixed ids (superuser insert bypasses RLS; the app role cannot insert users).
    await t.admin.sql`insert into users (id, email, display_name) values
      (${USER_A}, 'orga@example.test', 'Owner orga'), (${USER_B}, 'orgb@example.test', 'Owner orgb'),
      (${USER_C}, 'caretaker@example.test', 'Caretaker'), (${USER_M}, 'manager@example.test', 'Manager')`;
    for (const [org, user, name] of [
      [ORG_A, USER_A, 'orga'],
      [ORG_B, USER_B, 'orgb'],
    ] as const) {
      await t.app.withOrg(org, (tx) =>
        tx.insert(organizations).values({ id: org, name: `Org ${name}` }),
      );
      // first-owner bootstrap: org has no members yet and the caller is the new owner
      await t.app.withOrg(org, (tx) => addMembership(tx, org, user, 'owner'), { userId: user });
      await t.app.withOrg(org, (tx) =>
        tx.insert(auditEvents).values({
          organizationId: org,
          actorUserId: user,
          action: 'org.create',
          entityType: 'organization',
          entityId: org,
        }),
      );
    }
    await t.admin.sql`insert into memberships (organization_id, user_id, role, status) values
      (${ORG_A}, ${USER_C}, 'caretaker', 'active'), (${ORG_A}, ${USER_M}, 'manager', 'active')`;
  });

  afterAll(async () => {
    await t?.stop();
  });

  it('migrations applied and are re-runnable', async () => {
    await expect(runMigrations(t.migratorUrl)).resolves.toBeUndefined();
    const rows = await t.migrator.sql`select count(*)::int as n from drizzle.__drizzle_migrations`;
    expect(rows[0]?.n).toBe(2);
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
      expect(new Set((await tx.select().from(memberships)).map((m) => m.organizationId))).toEqual(
        new Set([ORG_A]),
      );
      expect((await tx.select().from(auditEvents)).map((e) => e.organizationId)).toEqual([ORG_A]);
      expect((await tx.select().from(users)).map((u) => u.id).sort()).toEqual(
        [USER_A, USER_C, USER_M].sort(),
      );
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
    await expect(t.admin.sql`update audit_events set action = 'x'`).rejects.toSatisfy(
      pgMatches(/append-only/),
    );
    await expect(t.admin.sql`delete from audit_events`).rejects.toSatisfy(pgMatches(/append-only/));
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
    await expect(t.app.sql`select 1 from memberships`).rejects.toSatisfy(
      pgMatches(/row-level security/),
    );
    await t.app.sql.unsafe('reset row_security');
  });

  it('direct membership inserts are impossible for the app role, even with a foreign user_id', async () => {
    for (const org of [ORG_A, ORG_B]) {
      await expect(
        t.app.withOrg(
          ORG_A,
          (tx) =>
            tx.insert(memberships).values({ organizationId: org, userId: USER_B, role: 'tenant' }),
          { userId: USER_A },
        ),
      ).rejects.toSatisfy(pgMatches(/permission denied/));
    }
  });

  it('forged invite of a foreign user does not expose that user and cannot be activated', async () => {
    // Owner A can invite by id (even a user of org B): the row starts as invited, not active.
    await t.app.withOrg(ORG_A, (tx) => addMembership(tx, ORG_A, USER_B, 'tenant'), {
      userId: USER_A,
    });
    await expect(
      t.app.withOrg(ORG_A, (tx) =>
        tx.update(memberships).set({ status: 'active' }).where(eq(memberships.userId, USER_B)),
      ),
    ).rejects.toSatisfy(pgMatches(/cannot be activated/));
    await t.app.withOrg(ORG_A, async (tx) => {
      const ids = (await tx.select().from(users)).map((u) => u.id);
      expect(ids).not.toContain(USER_B);
    });
  });

  it('app role cannot insert users or update users.email; display_name only for the current user', async () => {
    await expect(
      t.app.withOrg(ORG_A, (tx) =>
        tx.insert(users).values({ email: 'evil@example.test', displayName: 'x' }),
      ),
    ).rejects.toSatisfy(pgMatches(/permission denied/));
    await expect(
      t.app.withOrg(ORG_A, (tx) => tx.update(users).set({ email: 'x@example.test' }), {
        userId: USER_A,
      }),
    ).rejects.toSatisfy(pgMatches(/permission denied/));
    const own = await t.app.withOrg(
      ORG_A,
      (tx) =>
        tx.update(users).set({ displayName: 'Renamed' }).where(eq(users.id, USER_A)).returning(),
      { userId: USER_A },
    );
    expect(own).toHaveLength(1);
    // another visible user in the same org, then no user context at all: 0 rows
    const other = await t.app.withOrg(
      ORG_A,
      (tx) =>
        tx.update(users).set({ displayName: 'Hacked' }).where(eq(users.id, USER_M)).returning(),
      { userId: USER_A },
    );
    expect(other).toHaveLength(0);
    const noCtx = await t.app.withOrg(ORG_A, (tx) =>
      tx.update(users).set({ displayName: 'Hacked' }).returning(),
    );
    expect(noCtx).toHaveLength(0);
    // org B user from org A context, even acting as that user
    const foreign = await t.app.withOrg(
      ORG_A,
      (tx) =>
        tx.update(users).set({ displayName: 'Hacked' }).where(eq(users.id, USER_B)).returning(),
      { userId: USER_B },
    );
    expect(foreign).toHaveLength(0);
    const [b] = await t.admin.sql`select display_name from users where id = ${USER_B}`;
    expect(b?.display_name).toBe('Owner orgb');
  });

  it('moving a membership from org A to org B is denied', async () => {
    await expect(
      t.app.withOrg(ORG_A, (tx) =>
        tx.update(memberships).set({ organizationId: ORG_B }).where(eq(memberships.userId, USER_A)),
      ),
    ).rejects.toThrow();
    const [row] = await t.admin
      .sql`select count(*)::int as n from memberships where organization_id = ${ORG_B} and user_id = ${USER_A}`;
    expect(row?.n).toBe(0);
  });

  it('UPDATE/DELETE on org B rows from org A affect 0 rows or error', async () => {
    const o = await t.app.withOrg(ORG_A, (tx) =>
      tx
        .update(organizations)
        .set({ name: 'pwned' })
        .where(eq(organizations.id, ORG_B))
        .returning(),
    );
    expect(o).toHaveLength(0);
    const m = await t.app.withOrg(ORG_A, (tx) =>
      tx
        .update(memberships)
        .set({ role: 'tenant' })
        .where(eq(memberships.organizationId, ORG_B))
        .returning(),
    );
    expect(m).toHaveLength(0);
    await expect(
      t.app.withOrg(ORG_A, (tx) =>
        tx.delete(memberships).where(eq(memberships.organizationId, ORG_B)),
      ),
    ).rejects.toSatisfy(pgMatches(/permission denied/));
    await expect(
      t.app.withOrg(ORG_A, (tx) => tx.delete(organizations).where(eq(organizations.id, ORG_B))),
    ).rejects.toSatisfy(pgMatches(/permission denied/));
    const [r] = await t.admin.sql`select
      (select count(*)::int from organizations where name = 'pwned') as n,
      (select count(*)::int from memberships where organization_id = ${ORG_B}) as m`;
    expect(r).toEqual({ n: 0, m: 1 });
  });

  it('withOrg clears org and user context after the callback throws (rollback)', async () => {
    await expect(
      t.app.withOrg(
        ORG_A,
        async (tx) => {
          await tx
            .insert(auditEvents)
            .values({ organizationId: ORG_A, action: 'x', entityType: 'x' });
          throw new Error('boom');
        },
        { userId: USER_A },
      ),
    ).rejects.toThrow('boom');
    const [g] = await t.app.sql`select nullif(current_setting('app.current_org_id', true), '') as o,
      nullif(current_setting('app.current_user_id', true), '') as u`;
    expect(g).toEqual({ o: null, u: null });
    expect(await t.app.sql`select 1 from memberships`).toHaveLength(0);
    const [a] = await t.admin.sql`select count(*)::int as n from audit_events where action = 'x'`;
    expect(a?.n).toBe(0); // rolled back
  });

  it('the owner (kodibox_migrator) is still subject to FORCE RLS', async () => {
    for (const table of ['organizations', 'memberships', 'audit_events']) {
      expect(await t.migrator.sql.unsafe(`select 1 from ${table}`), table).toHaveLength(0);
    }
    await expect(
      t.migrator
        .sql`insert into memberships (organization_id, user_id, role) values (${ORG_B}, ${USER_A}, 'tenant')`,
    ).rejects.toSatisfy(pgMatches(/row-level security/));
    const upd = await t.migrator.sql`update organizations set name = 'x' where id = ${ORG_B}`;
    expect(upd.count).toBe(0);
  });

  it('definer functions are executable by the app role only', async () => {
    const rows = await t.admin.sql<{ proname: string; app: boolean; pub: boolean; sd: boolean }[]>`
      select proname, has_function_privilege('kodibox_app', oid, 'EXECUTE') as app,
             has_function_privilege('public', oid, 'EXECUTE') as pub, prosecdef as sd
      from pg_proc where proname in ('create_or_get_user_for_invite', 'add_membership')`;
    expect(rows).toHaveLength(2);
    for (const r of rows) expect(r, r.proname).toMatchObject({ app: true, pub: false, sd: true });
  });

  it('add_membership enforces org match and caller role', async () => {
    // org argument differs from the context
    await expect(
      t.app.withOrg(ORG_A, (tx) => addMembership(tx, ORG_B, USER_A, 'tenant'), { userId: USER_A }),
    ).rejects.toSatisfy(pgMatches(/context mismatch/));
    // no acting user
    await expect(
      t.app.withOrg(ORG_A, (tx) => addMembership(tx, ORG_A, USER_C, 'tenant')),
    ).rejects.toSatisfy(pgMatches(/not allowed/));
    // non-manager (caretaker) caller
    await expect(
      t.app.withOrg(ORG_A, (tx) => addMembership(tx, ORG_A, USER_C, 'tenant'), { userId: USER_C }),
    ).rejects.toSatisfy(pgMatches(/not allowed/));
    // owner of ANOTHER org acting in org A
    await expect(
      t.app.withOrg(ORG_A, (tx) => addMembership(tx, ORG_A, USER_B, 'tenant'), { userId: USER_B }),
    ).rejects.toSatisfy(pgMatches(/not allowed/));
    // a manager may add members but cannot grant owner
    await expect(
      t.app.withOrg(ORG_A, (tx) => addMembership(tx, ORG_A, USER_C, 'owner'), { userId: USER_M }),
    ).rejects.toSatisfy(pgMatches(/only an owner/));
    const first = await t.app.withOrg(
      ORG_A,
      (tx) => addMembership(tx, ORG_A, USER_C, 'accountant'),
      { userId: USER_M },
    );
    const again = await t.app.withOrg(
      ORG_A,
      (tx) => addMembership(tx, ORG_A, USER_C, 'accountant'),
      { userId: USER_M },
    );
    expect(again).toBe(first);
    // first-owner bootstrap is unavailable once the org has members
    await expect(
      t.app.withOrg(ORG_A, (tx) => addMembership(tx, ORG_A, USER_C, 'owner'), { userId: USER_C }),
    ).rejects.toSatisfy(pgMatches(/not allowed/));
  });

  it('create_or_get_user_for_invite enforces its checks and is stable per email', async () => {
    await expect(createUser(ORG_A, 'new1@example.test', 'N', USER_C)).rejects.toSatisfy(
      pgMatches(/not allowed/),
    );
    await expect(createUser(ORG_A, 'new1@example.test', 'N')).rejects.toSatisfy(
      pgMatches(/not allowed/),
    );
    await expect(createUser(ORG_A, 'not-an-email', 'N', USER_A)).rejects.toSatisfy(
      pgMatches(/invalid/),
    );
    const id1 = await createUser(ORG_A, 'New2@Example.test', 'N2', USER_M);
    const id2 = await createUser(ORG_A, 'new2@example.test', 'other name', USER_A);
    expect(id2).toBe(id1);
    // pre-existing user of org B: just the same opaque id; nothing becomes readable from org A
    expect(await createUser(ORG_A, 'orgb@example.test', 'x', USER_A)).toBe(USER_B);
    await expect(
      t.app.sql`select create_or_get_user_for_invite('a@example.test', 'a')`,
    ).rejects.toSatisfy(pgMatches(/organization context required/));
  });

  it('updated_at is maintained by the shared trigger', async () => {
    const [before] = await t.admin
      .sql`select extract(epoch from updated_at)::float8 as u from organizations where id = ${ORG_A}`;
    await t.app.withOrg(ORG_A, (tx) => tx.update(organizations).set({ name: 'Org orga' }));
    const [after] = await t.admin
      .sql`select extract(epoch from updated_at)::float8 as u from organizations where id = ${ORG_A}`;
    expect(after!.u as number).toBeGreaterThan(before!.u as number);
  });
});
