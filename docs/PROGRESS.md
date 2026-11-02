# Kodibox progress tracker

> Single source of truth for what's done, in progress and pending. Update it in the same PR as the work.
> Legend: ✅ done · 🔄 in progress · ⏳ pending · ⛔ blocked
> Last updated: 2026-11-02
> Spreadsheet version: [tracker.xlsx](tracker.xlsx) (task statuses, a live summary per track, and decisions). Keep both in step.

## Summary
| Track | Done | In progress | Pending |
|---|---|---|---|
| Planning & docs | 9 | 0 | 0 |
| Prototype (clickable UI on demo data) | 6 | 1 | 0 |
| Phase 0 engineering | 4 | 0 | 4 |
| Phase 0 legal | 0 | 0 | 6 |
| Phase 1 MVP | 0 | 0 | 18 |
| Phase 2+ | 0 | 0 | see PROJECT_PLAN.md |

## Planning & docs
| Item | Status | Where |
|---|---|---|
| Market research (Bomahut teardown) | ✅ | docs/research/bomahut-analysis.md |
| Kenyan legal research | ✅ (needs advocate review) | docs/research/legal-compliance-kenya.md |
| Project plan | ✅ | docs/PROJECT_PLAN.md |
| Development plan (sprints) | ✅ | docs/DEV_PLAN.md |
| Architecture, data model, ADRs 0001–0005 | ✅ | docs/ |
| Security & privacy by design | ✅ | docs/SECURITY.md, docs/PRIVACY_BY_DESIGN.md |
| Mobile app plan | ✅ | docs/MOBILE_APP_PLAN.md |
| UI designs (37 screens) incl. tenant tickets | ✅ | docs/design/ · [live canvas](https://claude.ai/artifact/Ke5VipbbUBXbdSKF9JGhfj) |
| Claude Code setup (agents, skills, hooks), README | ✅ | .claude/, README.md |

## Prototype track (fast, clickable, demo data, no backend)
Goal: see and test the whole product now. Screens live in `apps/web` and read from `apps/web/src/demo/` (typed demo data plus in-memory actions). Each later backend task swaps the demo source for real queries and keeps the UI.

| ID | Scope | Status |
|---|---|---|
| P-01 | App shell, design tokens, UI kit, demo data layer, sign-in and onboarding screens | ✅ |
| P-02 | Dashboard, payments reconciliation, invoices | ✅ |
| P-03 | Properties and units, tenants and leases, bulk import | ✅ |
| P-04 | Tickets, repairs and expenses, move-outs and deposits, utilities | ✅ |
| P-05 | Messages, reports and MRI tax, landlords/agency, landlord portal, settings, privacy, subscription | ✅ |
| P-06 | Mobile views (tenant, caretaker, manager) as responsive web routes under `/m` | ✅ |
| P-07 | Click-through QA pass, demo banner, shareable preview deploy (ask before deploying) | 🔄 (crawl of 230 pages passed; preview deploy waits on hosting decision) |

## Phase 0: engineering
| ID | Task | Status | Notes |
|---|---|---|---|
| E-01 | Monorepo scaffold | ✅ | on main |
| E-02 | CI pipeline | ✅ | on main; mark checks required on GitHub |
| E-03 | Database, RLS, migrations | ✅ | on main; passed 3 security review rounds, 35 db tests |
| E-04 | Auth with 2FA | ⏳ | next; carry E-03 notes (verify email before binding, rate-limit org creation) |
| E-05 | Orgs, roles, `can()` authz | ⏳ | |
| E-06 | Audit hash chain, PII encryption, log redaction | ⏳ | |
| E-07 | App shell / UI kit | ✅ | delivered through P-01 (shadcn not used; own UI kit) |
| E-08 | Staging environment | ⏳ | |

## Phase 0: legal & business (owner: founder)
| ID | Task | Status |
|---|---|---|
| L-01 | Engage Kenyan advocate (NPS Act opinion) | ⏳ |
| L-02 | ODPC registration + DPO | ⏳ |
| L-03 | ToS, privacy notice, DPA, SMS consent wording | ⏳ |
| L-04 | DPIA | ⏳ |
| L-05 | Daraja + Africa's Talking accounts, sender ID | ⏳ |
| L-06 | Verify `[CHECK]` legal items (MRI rate, eTIMS, retention) | ⏳ |

## Phase 1: MVP (backend + wiring the prototype UI to real data)
M1-01 properties/units ⏳ · M1-02 tenants ⏳ · M1-03 leases ⏳ · M1-04 ledger ⏳ · M1-05 invoice run ⏳ · M1-06 payment sources ⏳ · M1-07 C2B webhook ⏳ · M1-08 unmatched queue ⏳ · M1-09 STK push ⏳ · M1-10 cash maker-checker ⏳ · M1-11 receipts/statements ⏳ · M1-12 notifications ⏳ · M1-13 penalties ⏳ · M1-14 dashboard ⏳ · M1-15 reports ⏳ · M1-16 onboarding ⏳ · M1-17 subscriptions ⏳ · M1-18 ticket intake ⏳

## Open decisions
- File storage image to replace MinIO (needed by Sprint 3)
- License for the repository
- Whether to keep the `co-authored-by` trailer in commits
- Hosting for a shareable prototype preview (Vercel or similar)
