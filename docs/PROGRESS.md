# Kodibox progress tracker

> Single source of truth for what's done, in progress and pending. Update it in the same PR as the work.
> Legend: ✅ done · 🔄 in progress · ⏳ pending · ⛔ blocked
> Last updated: 2026-11-15
> Spreadsheet version: [tracker.xlsx](tracker.xlsx). Last synced 2026-11-02; it has not yet been updated for the 2026-11-15 changes (payment-agnostic reconciliation, prototypes). Keep both in step.

## Summary
| Track | Done | In progress | Pending |
|---|---|---|---|
| Planning & docs | 10 | 0 | 0 |
| Prototype (clickable UI on demo data, web and mobile) | 8 | 1 | 0 |
| Phase 0 engineering | 4 | 0 | 4 |
| Phase 0 legal | 0 | 0 | 6 |
| Phase 1 MVP (production backend) | 0 | 0 | 18 |
| Phase 3 mobile app (MA-01 to MA-12) | 0 | 1 | 11 |
| Phase 2+ | 0 | 0 | see PROJECT_PLAN.md |

"Done" in the prototype track means the UI works on demo data. It does not mean the feature is production-ready. Read the "Prototype and production" table below before reporting a feature as complete.

## Planning & docs
| Item | Status | Where |
|---|---|---|
| Market research (Bomahut teardown) | ✅ | docs/research/bomahut-analysis.md |
| Kenyan legal research | ✅ (needs advocate review) | docs/research/legal-compliance-kenya.md |
| Project plan | ✅ | docs/PROJECT_PLAN.md |
| Development plan (sprints) | ✅ | docs/DEV_PLAN.md |
| Architecture, data model, ADRs 0001–0007 | ✅ | docs/, docs/adr/ |
| Payment-agnostic reconciliation (ADR 0007, with addendum) | ✅ | docs/adr/0007-payment-agnostic-reconciliation.md |
| Security & privacy by design | ✅ | docs/SECURITY.md, docs/PRIVACY_BY_DESIGN.md |
| Mobile app plan | ✅ (v2, prototype status) | docs/MOBILE_APP_PLAN.md |
| UI designs (42 screens, incl. 5 added after the first set) | ✅ | docs/design/ (see its README) |
| Claude Code setup (agents, skills, hooks), README | ✅ | .claude/, README.md |
| Changelog | ✅ | CHANGELOG.md |

## Prototype track (fast, clickable, demo data, no backend)
Goal: see and test the whole product now. Web screens live in `apps/web` and read demo data from `packages/demo` (shared) through `apps/web/src/demo/`. The mobile app lives in `apps/mobile` and reads the same demo package. Each later backend task swaps the demo source for real queries and keeps the UI.

| ID | Scope | Status |
|---|---|---|
| P-01 | App shell, design tokens, UI kit, demo data layer, sign-in and onboarding screens | ✅ |
| P-02 | Dashboard, payments reconciliation, invoices | ✅ |
| P-03 | Properties and units, tenants and leases, bulk import | ✅ |
| P-04 | Tickets, repairs and expenses, move-outs and deposits, utilities | ✅ |
| P-05 | Messages, reports and MRI tax, landlords/agency, landlord portal, settings, privacy, subscription | ✅ |
| P-06 | Mobile views (tenant, caretaker, manager) as responsive web routes under `/m` | ✅ |
| P-07 | Click-through QA pass, demo banner, shareable preview deploy (ask before deploying) | 🔄 (crawl of 230 pages passed; preview deploy waits on hosting decision) |
| P-08 | Payment-agnostic reconciliation on web: import statement dialog with preview, unmatched queue, tenant claims tab, payment instructions (Settings and onboarding step 4), tenant "How to pay" and "I've paid", Settings → Appearance with light, dark and system themes | ✅ |
| P-09 | Mobile app prototype (`apps/mobile`, Expo SDK 58, Expo Router): Welcome, sign-in with OTP (demo), role switcher, tenant tabs, caretaker tabs, manager tabs (Home, Approvals, Tenants, Alerts, More), account and sign-out for every role, light, dark and system themes | ✅ |

## Prototype and production
What a user can click today, and what the production task still has to deliver.

| Capability | Prototype (demo data) | Production |
|---|---|---|
| Payment instructions (paybill, account reference, bank) | ✅ web settings, onboarding step 4, tenant "How to pay" with copy buttons | ⏳ M1-06 |
| Statement import (M-Pesa and bank CSV/XLSX) | ✅ import dialog with preview counts, conflicts, possible duplicates | ⏳ M1-07 (storage, worker and audit not built) |
| Reconciliation engine | ✅ pure logic in `packages/core/src/reconciliation`: parsers, normalise, dedupe, match, allocate, review; 160 tests reported, four security review rounds | ⏳ persistence, ledger posting and audit (M1-04, M1-08) |
| Unmatched queue | ✅ web list with match, split, not-rent actions on the demo store; mobile Approvals segment with Assign and Not rent | ⏳ M1-08 |
| Tenant payment claims ("I've paid") | ✅ web tenant screen and claims tab; mobile I've paid screen (paste SMS, parsed fields, warnings, pending notice) | ⏳ M1-09 |
| Cash entries with maker-checker | ✅ approve and reject on web and mobile (demo store) | ⏳ M1-10 |
| Receipts and statements | ✅ tenant receipt on mobile (source line: statement import, verified claim or cash) and tenant statement on mobile | ⏳ M1-11 |
| Authentication | ✅ sign-in screens with any input (web and mobile) | ⏳ E-04 (no real OTP, TOTP or sessions) |
| Roles and `can()` | ✅ role switcher in mobile; role labels in web Settings | ⏳ E-05 |
| Ledger and balances | ⏳ balances are demo values | ⏳ M1-04 |
| Theme (light, dark, system) | ✅ web (`kb-theme` cookie) and mobile, from `packages/ui` tokens | n/a |
| Mobile app | ✅ prototype | ⏳ MA-01 (CI and EAS outstanding), MA-02 to MA-12 |

## Test counts
Counts from source at 2026-11-15. "Blocks" means `it(` or `test(` blocks found by a static search; parameterised tables can run more cases.

| Area | Count | Note |
|---|---|---|
| Reconciliation engine (`packages/core/src/reconciliation`) | 160 tests reported | Static search finds 122 blocks in six files. Confirm the run count with `pnpm test`. |
| Database (`packages/db`) | 35 | RLS integration 30, guards 5 (E-03) |
| Core and shared (`packages/core` money and result, `packages/config` env, `packages/demo`) | 7 + 2 + 8 + 11 blocks | Static count |
| Mobile unit tests (`apps/mobile/src/lib`) | 20 blocks in 5 files | Payments engine, OTP, phone, readings, manager data |

## Phase 0: engineering
| ID | Task | Status | Notes |
|---|---|---|---|
| E-01 | Monorepo scaffold | ✅ | on main |
| E-02 | CI pipeline | ✅ | on main; mark checks required on GitHub |
| E-03 | Database, RLS, migrations | ✅ | on main; passed 3 security review rounds, 35 db tests |
| E-04 | Auth with 2FA | ⏳ | next; carry E-03 notes (verify email before binding, rate-limit org creation). Prototype sign-in is UI only. |
| E-05 | Orgs, roles, `can()` authz | ⏳ | prototype role labels only |
| E-06 | Audit hash chain, PII encryption, log redaction | ⏳ | |
| E-07 | App shell / UI kit | ✅ | delivered through P-01 (shadcn not used; own UI kit) |
| E-08 | Staging environment | ⏳ | |

## Phase 0: legal & business (owner: founder)
| ID | Task | Status | Notes |
|---|---|---|---|
| L-01 | Engage Kenyan advocate (NPS Act opinion on the reconciliation-only model) | ⏳ | |
| L-02 | ODPC registration + DPO | ⏳ | |
| L-03 | ToS, privacy notice, DPA, SMS consent wording | ⏳ | |
| L-04 | DPIA | ⏳ | |
| L-05 | Africa's Talking account and sender ID | ⏳ | Daraja approvals removed by ADR 0007 |
| L-06 | Verify `[CHECK]` legal items (MRI rate, eTIMS, retention) | ⏳ | |

## Phase 1: MVP (backend + wiring the prototype UI to real data)
| ID | Scope | Production | Prototype |
|---|---|---|---|
| M1-01 | Properties & units | ⏳ | ✅ P-03 |
| M1-02 | Tenants & contacts | ⏳ | ✅ P-03 |
| M1-03 | Leases and recurring charges | ⏳ | ✅ P-03 (TenantLease) |
| M1-04 | Ledger (`packages/core/ledger`) | ⏳ | none (demo balances) |
| M1-05 | Invoice run and invoices | ⏳ | ✅ P-02 |
| M1-06 | Payment instructions | ⏳ | ✅ P-08 |
| M1-07 | Statement import | ⏳ | ✅ P-08 dialog; parsers in core |
| M1-08 | Reconciliation engine and unmatched queue | ⏳ (engine in core: ✅ pure) | ✅ P-08 |
| M1-09 | Tenant payment claims | ⏳ | ✅ P-08 web and mobile |
| M1-10 | Manual payments with maker-checker | ⏳ | ✅ web and mobile |
| M1-11 | Receipts and statements | ⏳ | ✅ mobile tenant receipt and statement |
| M1-12 | Notifications | ⏳ | ✅ Messages screen |
| M1-13 | Penalties and waivers | ⏳ | not listed in P-tasks |
| M1-14 | Dashboard | ⏳ | ✅ P-01 and P-02 |
| M1-15 | Reports | ⏳ | ✅ P-05 |
| M1-16 | Onboarding wizard (7 steps) | ⏳ | ✅ P-01, opens at step 4 (see open items) |
| M1-17 | Subscriptions for Kodibox | ⏳ | ✅ P-05 Billing |
| M1-18 | Ticket intake | ⏳ | ✅ P-04 |

## Phase 3: mobile app (MA-01 to MA-12, see docs/MOBILE_APP_PLAN.md)
| ID | Status | Notes |
|---|---|---|
| MA-01 | 🔄 | Scaffold done (Expo SDK 58, Expo Router, TypeScript, workspace packages). CI build and EAS project outstanding. |
| MA-02 to MA-12 | ⏳ | Screens exist as prototype on demo data. No API client, auth, offline outbox or push yet. |

## Known open items
- Onboarding (7 steps) is reachable only from `/login` "Create account", and it opens at step 4 (Payment instructions). It should start at step 1 for a new Organization.
- Mobile sign-up is not built. Sign-in only (prototype).
- Role labels for independent landlords. An independent landlord is the Owner of their own Organization (see DATA_MODEL). The web and mobile labels do not yet say so.
- Agency-only modules (Landlords, landlord remittances) are visible to every role in the prototype. They should be hidden unless the Organization is an agency.
- Android navigation bar in Expo Go: the bottom bar overlaps the system bar on some devices.
- Certificate pinning ADR (needed before MA-10)

## Open decisions
- File storage image to replace MinIO (needed by Sprint 3)
- License for the repository
- Whether to keep the `co-authored-by` trailer in commits
- Hosting for a shareable prototype preview (Vercel or similar)
