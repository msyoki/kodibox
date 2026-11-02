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

## Migrations

Forward-only, in `migrations/`. `pnpm db:generate` for schema changes; use
`drizzle-kit generate --custom --name=rls_<table>` for hand-written SQL. Every new tenant table
needs RLS and grants in the same migration. `audit_events` is append-only (INSERT/SELECT grants
plus an immutability trigger). Hash-chain logic is E-06.

## Tests

`pnpm --filter @kodibox/db test` starts `postgres:16-alpine` with Testcontainers. Without Docker
the suite is skipped with a warning.
