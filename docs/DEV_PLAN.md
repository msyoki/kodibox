# Kodibox — Development Plan

> Turns the task IDs in `PROJECT_PLAN.md` (and `MOBILE_APP_PLAN.md`) into ordered sprints. Tick tasks off in PROJECT_PLAN.md as they merge.
> Sprint length: 2 weeks (Sprint 0 is 1 week). Start: week of 2 Nov 2026.

## 1. Ways of working
- **Branching:** trunk-based. `main` is always deployable. One short-lived branch per task: `feat/E-01-scaffold`, `fix/M1-07-idempotency`. PR to `main`; squash merge.
- **PR gates:** CI green (lint, typecheck, test, build, gitleaks, Semgrep, audit). The `.github/pull_request_template.md` checklist must be complete. CODEOWNERS paths need security review: in Claude Code run `/review-sensitive`, and a human signs off.
- **Claude workflow per task:**
  1. `/next-task`, or name the task ID.
  2. `feature-builder` implements it.
  3. `test-writer` fills test gaps.
  4. `/review-sensitive` for auth, money, PII, statement and claim imports, or migrations.
  5. `docs-writer` updates the docs.
  6. Human review, then merge.
  7. `/clear` before the next task.
- **Definition of Ready:** the task has a clear scope, its dependencies are merged, its screens exist in `docs/design/frames/` (for UI work), and any open legal question is answered or explicitly deferred.
- **Definition of Done:** see `PROJECT_PLAN.md` §8.

## 2. Local environment
| Service | How | Port |
|---|---|---|
| Postgres 16 | docker compose | 5432 |
| Redis 7 | docker compose | 6379 |
| Mailpit (email catcher) | docker compose | 8025 UI / 1025 SMTP |
| MinIO (S3-compatible) | docker compose | 9000 / 9001 console |
| Web (Next.js) | `pnpm dev` | 3000 |
| Worker | `pnpm dev` | — |
| Statement fixtures | Synthetic M-Pesa and bank CSV/XLSX files and SMS samples in `packages/integrations/payment-sources` tests (no payment-rail sandbox, ADR 0007) | — |
| SMS | Africa's Talking **sandbox** | — |

Requirements: Node 22 LTS, pnpm 10, Docker Desktop, git. Copy `.env.example` to `.env` (never commit `.env`).

## 3. Dependency map (critical path)
```
E-01 scaffold ─┬─ E-02 CI
               ├─ E-03 db + RLS ─┬─ E-04 auth ── E-05 orgs/roles/authz ── E-06 audit + PII crypto
               │                 └────────────────────────────────────────────┐
               └─ E-07 app shell/UI kit                                        ▼
M1-01 properties/units ── M1-02 tenants ── M1-03 leases ── M1-05 billing run ── M1-11 receipts/statements
M1-04 ledger (core, pure) ─────────────────────────────────┘        │
M1-06 payment instructions ── M1-07 statement import ── M1-08 reconciliation + unmatched queue ── M1-10 cash maker-checker
                                                                   └── M1-09 tenant payment claims
M1-12 notifications ── M1-13 penalties ── M1-14 dashboard ── M1-15 reports ── M1-16 onboarding ── M1-17 subscriptions
M1-02 tenants ─┬─ M1-18 ticket intake ── M2-11 tenant tickets (needs M1-12 notifications, E-06 audit)
M1-01 units ───┘          └── M2-05 work orders/expenses (repair tickets)
```
`M1-04` (ledger) is pure logic with no I/O, so it can start in parallel as soon as E-01 lands.

## 4. Sprint schedule

### Sprint 0 (Wk 1, 2–6 Nov): foundations
- [x] E-01 Monorepo scaffold (pnpm, Turborepo, TS strict, ESLint, Prettier, env validation, docker compose)
- [x] E-02 CI pipeline + Renovate + gitleaks pre-commit
- [ ] Legal kickoff: L-01 advocate engaged, L-05 SMS sender IDs and AT sandbox created
- **Demo:** `pnpm dev` boots web and worker against local Postgres and Redis; CI is green on an empty PR.

### Sprint 1 (Wk 2–3): platform core
- [x] E-03 `packages/db`: Drizzle, migrations, `withOrg()`, RLS baseline, Testcontainers harness
- [ ] E-04 Auth (Better Auth, 2FA enforced for owner/manager/accountant)
- [ ] E-05 Organizations, memberships, roles, `can()` + cross-org denial tests
- [ ] E-06 Hash-chained audit log, envelope encryption helper, log redaction
- [ ] E-07 App shell + design tokens from `docs/design/SCREEN_SPEC.md` (frames: Login, Main sidebar)
- [ ] E-08 Staging environment
- [ ] M1-04 Ledger in `packages/core` (parallel track)
- **Demo:** sign up, then 2FA, then create an org and invite a caretaker. RLS tests prove org A can't see org B.

### Sprint 2 (Wk 4–5): portfolio
- [ ] M1-01 Properties & units (+ CSV import) (frames: Properties, Import)
- [ ] M1-02 Tenants & contacts, encrypted IDs, consents (frame: TenantLease)
- [ ] M1-03 Leases, recurring charges, penalty rules, pro-rating
- **Demo:** import a 20-unit property from Excel and create leases.

### Sprint 3 (Wk 6–7): billing & reconciliation
- [ ] M1-05 Invoice run job + PDFs (frame: Invoices)
- [ ] M1-06 Payment instructions (frame: Onboarding)
- [ ] M1-07 Statement import: M-Pesa and bank CSV/XLSX parsers, column mapping, dedupe, preview
- [ ] M1-08 Reconciliation engine, auto-match, allocation, unmatched queue (frame: Payments)
- **Demo:** an imported paybill statement line auto-allocates to the right invoice and the ledger balances.

### Sprint 4 (Wk 8–9): collections loop
- [ ] M1-09 Tenant payment claims: paste M-Pesa SMS or upload slip, pending verification, approve/reject
- [ ] M1-10 Manual/cash payments with maker-checker
- [ ] M1-11 Receipts & statements
- [ ] M1-12 SMS/email notifications, reminders, opt-out, SMS wallet (frame: Messages)
- [ ] M1-13 Penalties job + waivers
- **Demo:** the full month cycle: invoice, reminder, payment, receipt, penalty, statement.

### Sprint 5 (Wk 10–11): MVP polish & pilot
- [ ] M1-14 Dashboard (frame: Main)
- [ ] M1-15 Reports + audited exports (frame: Reports)
- [ ] M1-16 Onboarding wizard
- [ ] M1-17 Kodibox subscription billing (frame: Billing)
- [ ] M1-18 Basic ticket intake: staff-logged + manager inbox, repair & complaint types, statuses, assignment, audit (frame: Tickets)
- [ ] Mini-pentest + fixes; pilot with 3–5 landlords importing live statements
- **Exit:** the Phase 1 exit criteria in PROJECT_PLAN.md.

### Sprints 6–9 (Wk 12–19): Phase 2 differentiators
| Sprint | Tasks |
|---|---|
| 6 | M2-01 Tenant portal PWA · M2-03 Utility billing · M2-11 Tenant tickets (frame: TenantTicket; the work-order link is added with M2-05 in Sprint 7) |
| 7 | M2-02 Caretaker views (offline) · M2-05 Expenses & maintenance |
| 8 | M2-04 Deposits · M2-07 Notices · M2-06 Agency mode + landlord portal |
| 9 | M2-08 MRI tax report · M2-09 DSR tooling · M2-10 Bank statement layouts → public beta |

### Sprints 10–14 (Wk 20–30): Phase 3 mobile & reach, Phase 4 hardening
| Sprint | Tasks |
|---|---|
| 10 | MA-01…MA-04 (app foundation, auth/biometrics, API client, tenant core) |
| 11 | MA-05…MA-08 (tenant pay/requests, caretaker offline, manager approvals, push) |
| 12 | MA-09…MA-12 (i18n, security hardening, store release) · M3-02 WhatsApp |
| 13 | M3-03 eTIMS · M3-04 USSD · M3-05 e-signing · H-02 load test |
| 14 | H-01 pentest · H-03 DR drill · H-04 IR tabletop · H-05 trust page → **GA** |

## 5. Risks to the schedule
- **Slow recognition** if landlords forget to import statements. Ship import reminders and visible tenant claims in Sprint 3 and 4, not later.
- **Single developer bandwidth.** Phase 2+ assumes a second engineer from Sprint 4.
- **Legal answers (L-06)** may change the MRI and eTIMS scope. They're scheduled for Sprint 9 or later, so there is time.
