# 0005. Multi-tenancy with a shared schema and PostgreSQL Row-Level Security

- Status: Accepted
- Date: 2026-11-02

## Context
Kodibox serves many organizations (landlords, agencies) with sensitive financial and personal data. A missing `WHERE organization_id = ?` in application code would leak data across customers. Options: database per tenant (strong isolation, costly operations at hundreds of small tenants), schema per tenant (migration fan-out), or shared schema with `organization_id` and database-enforced policies.

## Decision
- Shared schema; every tenant-scoped table has `organization_id uuid not null`.
- **RLS enabled and forced** on every such table, with policy `organization_id = current_setting('app.current_org_id')::uuid` for USING and WITH CHECK. Policies ship in the same migration as the table.
- The application connects as a non-owner role without `BYPASSRLS`. Each request/job runs inside a transaction that first executes `SET LOCAL app.current_org_id` (via `set_config(..., true)`); no context means no rows (fail closed).
- Org context comes from validated membership, never raw client input.
- Cross-org access exists only in audited platform-admin code paths using a dedicated role/flag, always logged to `audit_events`.
- Webhook ingress resolves the org via a narrow `SECURITY DEFINER` function, then proceeds with context set.
- Within an agency, isolation between landlords is application-level (`can()` scope) since they share one organization.
- Integration tests (Testcontainers) assert cross-tenant reads and writes fail for every table; CI fails if a table with `organization_id` lacks a policy.

## Consequences
- Isolation holds even if application queries are wrong; strong story for DPA 2019 and enterprise customers.
- Requires transaction-per-request discipline and care with connection pooling (transaction-mode pooling only with `SET LOCAL`).
- Slight planner overhead; mitigated by `organization_id`-leading indexes.
- Background jobs and migrations need explicit context handling; forgetting it returns empty results rather than leaking.
- Per-tenant backup/restore and data residency by tenant are harder than database-per-tenant; export jobs cover offboarding and DSRs.
- Noisy-neighbour risk is managed with quotas and queue concurrency limits.
