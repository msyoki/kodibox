# Kodibox — Claude Code Guide

Kodibox is a multi-tenant rent & property management SaaS for Kenya (landlords, property managers/agents, caretakers, tenants). It is a better alternative to Bomahut: payment-agnostic reconciliation of M-Pesa/bank statements and tenant payment proofs (no payment-rail integrations, see ADR 0007), accurate ledgers, tenant self-service, KRA-ready reports, and privacy-by-design under the Kenya Data Protection Act 2019.

Read before starting any non-trivial task:

- `docs/PROJECT_PLAN.md`: phases, milestones, scope
- `docs/ARCHITECTURE.md`: system design, modules, data flow
- `docs/DATA_MODEL.md`: entities, ledger rules
- `docs/SECURITY.md`: threat model and mandatory controls
- `docs/research/legal-compliance-kenya.md`: legal constraints that shape features

## Tech stack (decided; change only via an ADR in `docs/adr/`)

- **Monorepo:** pnpm workspaces + Turborepo, TypeScript strict everywhere, Node 22 LTS
- **apps/web:** Next.js 15 (App Router, React Server Components, Server Actions), Tailwind CSS + shadcn/ui
- **apps/worker:** Node worker running BullMQ jobs (invoicing runs, reminders, statement import parsing, reconciliation)
- **apps/mobile:** Expo / React Native (Phase 3) for tenants and caretakers
- **packages/db:** PostgreSQL 16 + Drizzle ORM + drizzle-kit migrations; Postgres Row-Level Security for tenancy isolation
- **packages/core:** pure domain logic (billing, ledger, penalties, allocations). No I/O; 100% unit-tested
- **packages/integrations:** payment-source parsers (M-Pesa paybill/till and bank statement CSV/XLSX, M-Pesa SMS text) behind one `PaymentSource` interface, Africa's Talking SMS, email (Resend/SES), KRA eTIMS. No payment-rail APIs (Daraja, bank APIs) per ADR 0007
- **packages/ui:** shared components
- **Auth:** Better Auth (email/phone + password, OTP, TOTP 2FA mandatory for owner/manager roles), session cookies (httpOnly, Secure, SameSite=Lax)
- **Validation:** Zod at every boundary (forms, server actions, API routes, file imports, env)
- **Infra:** Docker; Redis (BullMQ); S3-compatible object storage (private buckets, signed URLs); Sentry; OpenTelemetry logs
- **Testing:** Vitest (unit/integration with Testcontainers Postgres), Playwright (e2e)

## Non-negotiable rules

1. **Money:** store as integer minor units (`bigint` cents of KES) + `currency` column. Never use floats. All balance changes go through the double-entry ledger in `packages/core/ledger`. Ledger entries are append-only: correct mistakes with reversing entries, never UPDATE/DELETE.
2. **Never hold client funds.** Payments go straight to the landlord's own paybill/till/bank account. Kodibox never collects, initiates or detects payments; it only reconciles imported statements, tenant proofs and manual entries (ADR 0007). Any feature that would route money through a Kodibox account needs an ADR and a legal review (CBK National Payment System Act).
3. **Tenancy isolation:** every tenant-scoped table has `organization_id`, enforced by RLS. Every request sets `app.current_org_id` within its transaction. Never query across orgs except in audited platform-admin code paths.
4. **Authorization:** check permissions on the server for every action via `can(user, action, resource)` in `packages/core/authz`. Hiding UI is not access control.
5. **Personal data (DPA 2019):** collect the minimum. National ID / KRA PIN / phone numbers are encrypted at the application layer (envelope encryption) and masked in the UI and logs. Never log PII, tokens, statement lines or M-Pesa messages unredacted. Record consent and lawful basis. Respect retention periods in `docs/SECURITY.md`.
6. **Audit log:** every state change to money, leases, users/roles, or settings writes an `audit_events` row (actor, action, before/after diff, IP, user agent).
7. **Payment evidence (statements, tenant proofs, manual entries):** no payment-rail integrations or payment webhooks (ADR 0007). Imports are permission-gated and audited; deduplicate on (org, source account, external transaction ref) so re-imports are no-ops; store raw files/lines encrypted with retention per `docs/SECURITY.md`; parse and match in the worker via the pure engine in `packages/core/reconciliation`; tenant proofs stay "pending verification" until matched or approved.
8. **Secrets:** env vars only, validated by `packages/config/env.ts`. Never commit `.env*` (except `.env.example`). Never hard-code credentials, even in tests.
9. **Migrations:** forward-only, reviewed, and every new table gets RLS policies in the same migration.
10. **Notifications:** SMS/email only to contacts with a lawful basis. Marketing messages need opt-in and an opt-out (STOP) path.

## Conventions

- Feature folders: `apps/web/src/features/<feature>/{components,actions,queries,schemas}`.
- Server Actions return `Result<T, AppError>`; never throw raw errors to the client.
- Name things in domain language: Property, Unit, Lease, Tenant (person renting), Organization (customer account), Invoice, Charge, Payment, Allocation, Statement.
- "Tenant" means the renter. The SaaS customer is an "Organization". Never mix them up.
- Dates: store UTC `timestamptz`; display in `Africa/Nairobi`. Billing periods are calendar dates (`date`).
- Phone numbers are stored in E.164 format (`+2547XXXXXXXX`).
- Commits follow Conventional Commits (`feat(billing): ...`).

## Commands (once scaffolded)

```
pnpm install
pnpm dev                 # web + worker
pnpm db:migrate          # apply migrations
pnpm db:seed             # demo org with properties, units, tenants
pnpm test                # vitest
pnpm test:e2e            # playwright
pnpm lint && pnpm typecheck
```

## How to work in this repo (token-efficient)

- Use the project agents in `.claude/agents/`. They run on cheaper models for focused jobs:
  - `codebase-scout` (Haiku): finds files and patterns. Use it instead of reading many files yourself.
  - `feature-builder` (Sonnet): implements one scoped task from the plan.
  - `test-writer` (Sonnet): writes and fixes tests.
  - `security-reviewer` (Opus): reviews diffs touching auth, money, PII, or statement imports.
  - `compliance-reviewer` (Sonnet): checks features against Kenyan law and the DPA.
  - `docs-writer` (Haiku): keeps docs and ADRs in sync.
- Use the project skills in `.claude/skills/` (`payment-reconciliation`, `ledger-money`, `kenya-compliance`, `secure-feature`, `drizzle-rls`). Load the relevant skill before touching its area.
- Build one milestone task at a time from `docs/PROJECT_PLAN.md`, finish it, test it, then tick it off.
- Prefer targeted reads (Grep, then Read with offset/limit) over reading whole files.
