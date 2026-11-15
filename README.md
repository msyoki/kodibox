<div align="center">

# Kodibox

**Rent and property management for Kenya: collect rent straight into the landlord's own M-Pesa paybill or bank account, reconcile it automatically, and give tenants a self-service app.**

[![CI](https://github.com/msyoki/kodibox/actions/workflows/ci.yml/badge.svg)](https://github.com/msyoki/kodibox/actions/workflows/ci.yml)
[![CodeQL](https://github.com/msyoki/kodibox/actions/workflows/codeql.yml/badge.svg)](https://github.com/msyoki/kodibox/actions/workflows/codeql.yml)
![Status](https://img.shields.io/badge/status-early%20development-orange)
![Node](https://img.shields.io/badge/node-22%20LTS-339933)

</div>

---

> **Status:** early development (Sprint 0–1). The project plan, architecture, security model and UI designs are complete, and the monorepo scaffold and CI are in place. Clickable web and mobile prototypes run on demo data, and the reconciliation engine exists as pure, tested logic. The backend (auth, database, ledger, persistence of imports and claims) is not built yet. Progress is tracked in [docs/PROGRESS.md](docs/PROGRESS.md), and the build order is in [docs/DEV_PLAN.md](docs/DEV_PLAN.md).

## Why Kodibox

Most Kenyan landlords still chase rent through M-Pesa messages, spreadsheets and phone calls. Kodibox automates that loop and stays on the right side of the law:

- **We never hold your money.** Tenants pay directly into the landlord's own paybill, till or bank account. Kodibox only reconciles the statements and payment proofs you bring in. It has no connection to M-Pesa or bank APIs (ADR 0007).
- **Automatic reconciliation.** Statement lines and tenant payment proofs are matched to the right unit and invoice, with a confidence score. Payments with a wrong account number go to a review queue with suggested matches.
- **An accurate ledger.** Every shilling goes through a double-entry ledger. Mistakes are corrected with reversals, never deleted.
- **Privacy by design.** The platform is built for the Data Protection Act 2019: consent records, data subject rights, encryption of ID and KRA PIN numbers, and audit logs.

## Features

| Area | What it does |
|---|---|
| **Properties & tenants** | Properties, units, tenants and leases. Bulk import from Excel/CSV. Residential and commercial units. |
| **Billing** | Monthly invoice runs, recurring charges, metered water and electricity, penalties with grace periods, deposits, pro-rating. |
| **Payments** | Payment instructions (paybill, till, bank) with copy buttons. Statement import for M-Pesa and bank files, tenant "I've paid" claims, an unmatched queue, cash with maker-checker approval, receipts. No payment-rail integrations. |
| **Reminders** | SMS and email reminders with quiet hours and opt-out handling. WhatsApp is planned. |
| **Tickets** | Tenants raise repair requests, complaints and billing queries, with response-time targets, escalation to the owner and ratings. |
| **Move-outs** | Lawful notices, move-out inspections, deposit refund statements. |
| **Agencies** | Multiple landlords, commission rules, remittance statements, a read-only landlord portal. |
| **Reports & tax** | Rent roll, arrears aging, collections, income and expenses, the Monthly Rental Income (MRI) tax report, eTIMS-ready receipts. |
| **Mobile app** | One Expo app with tenant, caretaker (offline meter readings, inspections) and manager views. Prototype on demo data. |
| **Security** | 2FA for owners, managers and accountants. Role-based access, row-level data isolation, a tamper-evident audit log. |

UI designs for all 42 web and mobile screens are in [docs/design/](docs/design/).

## Tech stack

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo, TypeScript (strict) |
| Web | Next.js 15 (App Router, Server Actions), React 19, Tailwind CSS v4 |
| Background jobs | Node worker with BullMQ on Redis |
| Database | PostgreSQL 16, Drizzle ORM, row-level security per organisation |
| Mobile | Expo SDK 58 / React Native with Expo Router (prototype) |
| Integrations | Africa's Talking (SMS), email, KRA eTIMS (planned). No payment-rail integrations (ADR 0007). |
| Validation | Zod at every boundary |
| Testing | Vitest, Testcontainers, Playwright |

## Architecture

```mermaid
flowchart LR
  T[Tenant app / portal] --> W
  L[Landlord & staff web app] --> W[Next.js web]
  W --> DB[(PostgreSQL + RLS)]
  W --> Q[(Redis / BullMQ)]
  Q --> K[Worker: invoices, reminders, reconciliation]
  K --> DB
  L -- statement files --> W
  T -- "I've paid" proof --> W
  K -- SMS --> AT[Africa's Talking]
  T -- pays directly --> PB[Landlord's own paybill / bank]
  PB -. statement .-> L
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [docs/DATA_MODEL.md](docs/DATA_MODEL.md) for the full design.

## Repository layout

```
apps/
  web/            Next.js app for landlords, staff and tenants
  worker/         background jobs (BullMQ)
  mobile/         Expo app for tenants, caretakers and managers (prototype)
packages/
  config/         environment validation (Zod)
  core/           pure domain logic: money, ledger, billing, reconciliation (no I/O)
  db/             schema, migrations, row-level security
  demo/           shared demo data for the web and mobile prototypes
  integrations/   SMS, email, KRA, storage
  ui/             shared components and colour tokens (light and dark)
docs/             plans, architecture, security, privacy, ADRs, designs
.claude/          Claude Code agents, skills and guard hooks
```

## Getting started

**Requirements:** Node 22 LTS, pnpm 10, Docker.

```bash
git clone https://github.com/msyoki/kodibox.git
cd kodibox
cp .env.example .env            # local placeholder values; never commit .env
docker compose up -d postgres redis mailpit
pnpm install
pnpm dev                        # web on http://localhost:3000, plus the worker
```

> **Windows:** if port 5432 is reserved, set `POSTGRES_PORT=5433` in `.env` and the database URLs.

| Command | What it does |
|---|---|
| `pnpm dev` | Run the web app and worker in watch mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` / `pnpm typecheck` | ESLint and TypeScript checks |
| `pnpm test` | Unit and integration tests (Vitest) |
| `pnpm format` | Format the codebase with Prettier |
| `pnpm db:migrate` / `pnpm db:seed` | Apply migrations and seed demo data (arrives with the database layer) |

Mailpit (the local email inbox) is at http://localhost:8025. SMS runs against the Africa's Talking **sandbox** in development. There is no Safaricom sandbox to set up, because Kodibox does not call M-Pesa (ADR 0007).

### Run the web prototype

The web prototype runs on demo data with no database.

```bash
pnpm --filter @kodibox/web dev      # http://localhost:3000 (/ redirects to /login)
```

Sign in with anything, enter any 6 digits for 2FA, and land on `/dashboard`. Payment screens are under `/payments`, and payment instructions are under `/settings/payment-instructions`.

### Run the mobile app with Expo Go over USB

The mobile prototype runs on demo data. It has no sign-in backend.

Requirements: an Android phone with USB debugging on, the Expo Go app installed, and `adb` (Android platform-tools) on your PATH.

```bash
pnpm --filter @kodibox/mobile exec expo start --localhost   # Metro on this computer
adb reverse tcp:8081 tcp:8081                              # let the phone reach Metro over USB
```

Open Expo Go on the phone and scan the QR code. The package script `pnpm --filter @kodibox/mobile start` uses `--lan`, which needs the phone on the same Wi-Fi network. Use `--localhost` with `adb reverse` for USB. Known issue: on some Android devices the bottom tab bar overlaps the system navigation bar in Expo Go (see [docs/PROGRESS.md](docs/PROGRESS.md)).

## Documentation

| Doc | Purpose |
|---|---|
| [Project plan](docs/PROJECT_PLAN.md) | Vision, phases, task IDs, metrics, risks |
| [Development plan](docs/DEV_PLAN.md) | Sprint schedule, workflow, local environment |
| [Architecture](docs/ARCHITECTURE.md) | System design and payment flows |
| [Data model](docs/DATA_MODEL.md) | Schema and double-entry ledger rules |
| [Security](docs/SECURITY.md) | Threat model and mandatory controls |
| [Privacy by design](docs/PRIVACY_BY_DESIGN.md) | Data Protection Act 2019 implementation |
| [Mobile app plan](docs/MOBILE_APP_PLAN.md) | Expo app for tenants, caretakers and managers |
| [Design](docs/design/) | UI frames and design tokens |
| [CI](docs/CI.md) | Pipeline jobs and how to run them locally |
| [ADRs](docs/adr/) | Architecture decision records |
| [Research](docs/research/) | Market analysis and Kenyan legal research |
| [Claude workflow](docs/CLAUDE_WORKFLOW.md) | Developing with Claude Code agents and skills |
| [Progress](docs/PROGRESS.md) | What is done as prototype and what is in production |
| [Prototype](docs/PROTOTYPE.md) | Clickable web prototype and the shared demo packages |
| [Changelog](CHANGELOG.md) | Notable changes, in Keep a Changelog format |

## Roadmap

- [x] Planning, architecture, security and privacy design
- [x] Monorepo scaffold and CI pipeline
- [x] Clickable web and mobile prototypes on demo data
- [x] Payment-agnostic reconciliation engine (pure logic with tests, ADR 0007)
- [ ] **Sprint 1:** database with row-level security, auth with 2FA, roles, audit log, ledger
- [ ] **Sprints 2–5:** properties, tenants, leases, billing, statement reconciliation, reminders, then a pilot with landlords
- [ ] **Sprints 6–9:** tenant portal, caretaker tools, deposits, agency mode, MRI tax report, then public beta
- [ ] **Sprints 10–14:** mobile app, WhatsApp, eTIMS, USSD, penetration test, then general availability

## Contributing

1. Pick a task from [docs/DEV_PLAN.md](docs/DEV_PLAN.md) and branch from `main` (`feat/<task>-short-name`).
2. Follow the rules in [CLAUDE.md](CLAUDE.md): integer money, the ledger only, RLS on every table, server-side authorisation, no PII in logs.
3. Write commit messages in lowercase [conventional commit](https://www.conventionalcommits.org/) style, for example `feat(billing): add monthly invoice run`.
4. Open a pull request. CI must pass, and changes to auth, money, personal data, statement or claim imports, or migrations need a security review (see [CODEOWNERS](.github/CODEOWNERS)).

## Security

Please don't open public issues for vulnerabilities. See [SECURITY.md](SECURITY.md) for how to report them.

## Legal

The compliance documents in this repo are research notes, not legal advice. They must be reviewed by a Kenyan advocate before launch.

## License

Copyright © 2026 Kodibox. All rights reserved. No license has been granted yet.
