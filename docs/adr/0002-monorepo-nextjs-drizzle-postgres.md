# 0002. Monorepo with Next.js, Drizzle and PostgreSQL

- Status: Accepted
- Date: 2026-11-02

## Context
Kodibox needs a web app (landlords, agents, caretakers, tenants), background workers (invoicing, reminders, webhook processing), and later a mobile app. A small team must ship fast, share types and validation across surfaces, and keep correctness-critical logic (billing, ledger) testable. Data is relational and transactional; tenancy isolation must be enforceable at the database.

## Decision
- One **pnpm + Turborepo monorepo**, TypeScript strict, Node 22 LTS.
- **Next.js 15** (App Router, RSC, Server Actions) for `apps/web`; Tailwind + shadcn/ui.
- **Node worker with BullMQ + Redis** for `apps/worker`; webhooks are persisted then processed asynchronously.
- **PostgreSQL 16 with Drizzle ORM and drizzle-kit** (SQL-first, forward-only migrations, raw SQL allowed for RLS and triggers) in `packages/db`.
- **Pure domain package** `packages/core` (no I/O) holds billing, ledger, allocation, penalties, authz.
- **Zod** at every boundary; REST + OpenAPI generated from Zod for mobile (Expo).
- Modular monolith, not microservices; one Postgres, one Redis, one object store.

## Consequences
- Shared types and schemas end to end; one language for web, worker and mobile.
- Core logic is fast to unit test and independent of frameworks.
- Drizzle keeps SQL visible, which suits RLS, constraints and triggers, but has less abstraction than Prisma; we write some SQL by hand.
- Next.js couples UI and API deployment; the worker scales separately.
- Redis becomes an operational dependency; durable state stays in Postgres so Redis loss is recoverable.
- Dependency rules between packages must be enforced in CI to keep `core` pure.
- Single Postgres is the scaling ceiling; acceptable for Year 1 targets, with partitioning and read replicas as the next steps.
