# @kodibox/db

Drizzle ORM + PostgreSQL 16 + Row-Level Security. See `docs/adr/0005-postgres-rls-multitenancy.md`.

## Roles and connection strings

| Variable                                         | Role                        | Used by                                   |
| ------------------------------------------------ | --------------------------- | ----------------------------------------- |
| `DATABASE_URL`                                   | `kodibox_app`               | Runtime (web, worker), `db:seed`          |
| `MIGRATION_DATABASE_URL`                         | `kodibox_migrator`          | `db:migrate` only (CI/deploy). Never set on runtime services |
| `DATABASE_ADMIN_URL`                             | privileged (CREATE ROLE)    | `db:bootstrap` only, once per environment |

- `kodibox_migrator` owns the database/schema and runs DDL. `kodibox_app` is NOLOGIN-by-default
  in migrations, gets LOGIN + password from `db:bootstrap`, has no `BYPASSRLS`, owns nothing and
  only receives explicit table grants. Tables use `ENABLE` + `FORCE ROW LEVEL SECURITY`.
- Fresh environment: `pnpm db:bootstrap` (needs `DATABASE_ADMIN_URL`, `KODIBOX_MIGRATOR_PASSWORD`,
  `KODIBOX_APP_PASSWORD`) then `pnpm db:migrate` then optionally `pnpm db:seed`.
- Local port: set `POSTGRES_PORT` (e.g. 5433 on Windows) and use the same port in all URLs.

## Environment per process

| Process                  | Sets                                              | Must NOT set                                    |
| ------------------------ | ------------------------------------------------- | ----------------------------------------------- |
| web / worker (runtime)   | `DATABASE_URL` (kodibox_app)                      | `MIGRATION_DATABASE_URL`, `DATABASE_ADMIN_URL`  |
| migrate job (CI/deploy)  | `MIGRATION_DATABASE_URL` (kodibox_migrator)       | admin URL, runtime secrets                      |
| bootstrap (once per env) | `DATABASE_ADMIN_URL`, `KODIBOX_*_PASSWORD`        | runtime/migrator URLs                           |
| seed (dev/test only)     | `DATABASE_URL` (kodibox_app)                      | refuses to run when NODE_ENV=production         |

`packages/config` rejects, in production, a runtime env that contains the migrator/admin URLs or a
`DATABASE_URL` user other than `kodibox_app`. Bootstrap refuses passwords containing `change-me`
or shorter than 24 characters unless NODE_ENV is development or test.

## Using the database

```ts
import { withOrg } from '@kodibox/db';
await withOrg(orgId, async (tx) => tx.select().from(memberships));
```

`withOrg` validates the UUID, opens a transaction and runs `set_config('app.current_org_id', $1, true)`
(SET LOCAL semantics, parameterised). Policies call `app_current_org_id()`; with no org set they
match nothing (fail closed). The exported `db` is a facade without a query builder, so org-scoped
queries cannot bypass `withOrg`. Raw clients live in `@kodibox/db/internal` (ESLint forbids importing
it outside this package). `withPlatformAdmin()` is a stub until E-05/E-06.

`withOrg(orgId, fn, { userId })` also sets `app.current_user_id` (the acting user). Both GUCs are
transaction-local and written only in `src/client.ts`; `scripts/check-guc-usage.mjs` (part of
`pnpm lint`) fails on `set_config` or `app.current_*_id` anywhere else except migrations.

Identity: `kodibox_app` cannot INSERT into `users` or `memberships`, and can only UPDATE
`users.display_name` (own row) and `memberships(role, status, updated_at)`. Use the SECURITY DEFINER
functions `create_or_get_user_for_invite(email, display_name)` and `add_membership(org, user, role)`.
Activating a membership is reserved for the invite-acceptance flow (E-04), which must verify email
ownership first.

## Migrations

Forward-only, in `migrations/`. `pnpm db:generate` for schema changes; use
`drizzle-kit generate --custom --name=rls_<table>` for hand-written SQL. Every new tenant table
needs RLS and grants in the same migration. `audit_events` is append-only (INSERT/SELECT grants
plus an immutability trigger). Hash-chain logic is E-06.

### New-table checklist

Every new table: organization_id, ENABLE+FORCE RLS, policies, explicit GRANTs in the same migration.
Also: org-leading indexes, an `updated_at` trigger via `set_updated_at()` if the table has the
column, and a Testcontainers cross-org test.

## Tests

`pnpm --filter @kodibox/db test` starts `postgres:16-alpine` with Testcontainers. Without Docker
the suite is skipped with a warning.
