# Kodibox — Project Plan

> Status: Draft v1 · 2026-11-02 · Owner: Kodibox founding team
> Inputs: `docs/research/bomahut-analysis.md`, `docs/research/legal-compliance-kenya.md`

## 1. Vision
Kodibox is the rent management system Kenyan landlords, agents and tenants trust. It collects rent straight into the landlord's own M-Pesa paybill/till or bank account and reconciles every shilling automatically. It keeps an auditable ledger, gives tenants a self-service portal, and produces KRA-ready reports. It is built privacy-first under the Data Protection Act 2019.

## 2. Problem & opportunity (from the Bomahut teardown)
Bomahut proves demand for the following:
- Automated invoices, reminders, receipts and reconciliation.
- M-Pesa, bank and card collection.
- Meter billing.
- Statements.
- Flat tiered pricing (KSh 2,500 for 5–20 units, 4,500 for 21–50, 7,000 for 51–100).

Publicly visible gaps that Kodibox targets:

| Gap | Kodibox answer |
|---|---|
| No tenant portal or mobile app | Tenant PWA (Phase 2) and a native app (Phase 3), with STK Push "pay now" in 2 taps and SMS/USSD fallback |
| No caretaker workflow | Caretaker role with offline meter readings, photo evidence, move-in/out checklists |
| No maintenance tickets; passive tenant side | Tenant repair and complaint tickets (M1-18 staff intake, M2-11 tenant app/portal) with SLAs, escalation to the Owner, audited thread and ratings |
| Thin lease and deposit lifecycle | Full lease lifecycle: digital lease, deposit held as liability, move-out inspection, deposit refund statement |
| No expenses or owner payout statements | Expenses, agency commission, landlord remittance statements |
| No tax tooling | Monthly Rental Income (MRI) tax report and eTIMS-ready receipts |
| Expensive for small landlords (≈KSh 500/unit at 5 units) | Free tier (≤3 units) and per-unit pricing (§9) |
| Weak trust signals | "We never hold your money", ODPC-registered, published security page, 2FA, audit trail |

## 3. Users & roles
- **Owner** (landlord or agency principal): full control and billing.
- **Manager** (property manager/agent): day-to-day operations across assigned properties.
- **Accountant:** payments, reconciliation and reports. Read-only on leases.
- **Caretaker:** meter readings, maintenance, move-in/out checks, and recording cash with photo evidence pending approval. No access to ledgers.
- **Tenant:** invoices, statements, pay, receipts, maintenance requests, notices.
- **Landlord (client of an agency):** read-only portal with statements and remittances.
- **Platform admin** (Kodibox staff): support with audited, time-boxed, consented impersonation only.

## 4. Scope by phase

### Phase 0: Foundations, legal & scaffold (Weeks 1–3)
Legal and business tasks run in parallel with engineering:
- [ ] L-01 Register the company and engage a Kenyan advocate (fintech/data protection) for an opinion on the reconciliation-only model under the NPS Act (ADR-0003).
- [ ] L-02 Register with ODPC as data controller and processor, and appoint a DPO (can be outsourced).
- [ ] L-03 Draft and review legal documents with the advocate: Terms of Service, Privacy Notice, Data Processing Agreement (landlord = controller, Kodibox = processor), tenant-facing privacy notice, and SMS consent wording.
- [ ] L-04 Run a DPIA for the core platform (template in `docs/PRIVACY_BY_DESIGN.md`).
- [ ] L-05 Apply for Safaricom Daraja production access and register SMS sender IDs (Africa's Talking).
- [ ] L-06 Verify the open legal items flagged `[CHECK]` in `docs/research/legal-compliance-kenya.md`: current MRI rate/thresholds, eTIMS applicability to residential rent, record-retention period, and Landlord & Tenant Bill status.

Engineering tasks:
- [x] E-01 Monorepo scaffold: pnpm, Turborepo, TS strict, ESLint, Prettier, `packages/config/env.ts` (Zod).
- [x] E-02 CI (GitHub Actions): lint, typecheck, test, build, gitleaks, Semgrep, `pnpm audit`, Trivy; Renovate.
- [ ] E-03 `packages/db`: Drizzle, migrations, `withOrg()` + RLS baseline, Testcontainers test harness.
- [ ] E-04 Auth: Better Auth (email/phone + password, OTP, TOTP 2FA mandatory for owner/manager/accountant), sessions, rate limits.
- [ ] E-05 Organizations, memberships, roles, `can()` authz module + tests (including cross-org denial tests).
- [ ] E-06 Audit log (hash-chained `audit_events`), PII envelope encryption helper, log redaction.
- [ ] E-07 App shell: layout, navigation, design system (shadcn/ui), Africa/Nairobi formatting, KES money formatting.
- [ ] E-08 Staging environment: Docker, managed Postgres, Redis, object storage, Sentry.

**Exit criteria:** a user can sign up, create an org, invite a member with a role, and pass 2FA. RLS isolation tests are green. CI is fully gated.

### Phase 1: MVP, core rent collection (Weeks 4–11)
- [ ] M1-01 Properties & units (types, residential/commercial flag, unit codes used as M-Pesa account numbers), bulk import from CSV/Excel.
- [ ] M1-02 Tenants & contacts (encrypted ID/KRA PIN, consent capture), bulk import.
- [ ] M1-03 Leases: start/end, rent, deposit, recurring charges (service charge, garbage, parking), due day, grace period, penalty rule (flat or % with cap). Move-in pro-rating.
- [ ] M1-04 `packages/core/ledger`: chart of accounts, double-entry posting, reversals, balances + nightly verifier.
- [ ] M1-05 Billing engine: monthly invoice run job (idempotent per lease+period), invoice numbering per org, PDF invoices.
- [ ] M1-06 Payment sources: connect the landlord's own paybill/till (Daraja credentials encrypted), C2B URL registration, health check.
- [ ] M1-07 C2B confirmation webhook: verification, idempotency, Transaction Status re-check, auto-match by account number/phone, auto-allocation oldest-first, overpayment to credit.
- [ ] M1-08 Unmatched payments queue: manual match/split with audit trail.
- [ ] M1-09 STK Push "request payment" from the dashboard and a tenant pay link.
- [ ] M1-10 Manual payments (cash/cheque/bank deposit) with maker-checker approval for caretaker-entered cash.
- [ ] M1-11 Receipts (SMS + PDF) and tenant statements.
- [ ] M1-12 Notifications: SMS (Africa's Talking) and email; templates; reminder schedule (before due, on due, overdue); opt-out handling; delivery logs; per-org SMS credit wallet billed by Kodibox (SMS fees only, never rent).
- [ ] M1-13 Penalties job (after grace period, idempotent) with waiver workflow.
- [ ] M1-14 Dashboard: collected vs expected, arrears aging (0–30/31–60/61–90/90+), occupancy, recent payments.
- [ ] M1-15 Reports: rent roll, arrears, collections by property, Excel/CSV/PDF export (exports audited and permission-gated).
- [ ] M1-16 Onboarding wizard: org → property → units → payment source → import tenants → first invoice run, in under 15 minutes.
- [ ] M1-17 Subscription billing for Kodibox itself (plans, trial, invoices to the org).
- [ ] M1-18 Basic ticket intake (staff-logged + manager inbox, repair & complaint types, statuses, assignment, audit).

**Exit criteria:**
- A pilot with 3–5 landlords (~200 units) running live M-Pesa for 1 full month.
- Over 95% of payments auto-matched.
- The ledger verifier reports zero discrepancies.
- The security-reviewer and an external mini-pentest find no critical or high issues.

### Phase 2: Differentiators (Weeks 12–19)
- [ ] M2-01 Tenant portal (PWA): invoices, statements, pay via STK, receipts, notices, maintenance requests, document access. Login by phone + OTP.
- [ ] M2-02 Caretaker app view: offline-capable meter readings with photo, move-in/out inspection checklists.
- [ ] M2-03 Utility billing: metered water/electricity (tiered tariffs), shared-meter apportioning, bulk reading upload.
- [ ] M2-04 Deposits lifecycle: held as liability, move-out deductions with evidence, refund statement, and handover to the landlord's own payment process (Kodibox doesn't disburse).
- [ ] M2-05 Expenses & work orders (vendors, costs) linked to repair tickets: work order → vendor → cost → expense entry.
- [ ] M2-06 Agency mode: multiple landlords, commission rules, landlord remittance statements, landlord read-only portal.
- [ ] M2-07 Notices: vacation notices, rent-increase notices from advocate-reviewed templates with configurable notice periods. No automated eviction, lockout or distress features (legal).
- [ ] M2-08 MRI tax report: monthly gross residential rent per landlord, KRA-format export, deadline reminders (20th).
- [ ] M2-09 Data subject rights tooling: export, rectification, erasure with legal-hold exceptions, DSR request tracker with SLA.
- [ ] M2-10 Bank integrations: one bank (e.g. Equity/KCB/Co-op) paybill or statement callbacks; bank statement CSV import + matcher.
- [ ] M2-11 Tenant tickets in tenant portal/app: create with photos, thread, notifications, SLAs & escalation, ratings, reports.

### Phase 3: Scale & reach (Weeks 20–30)
- [ ] M3-01 Native mobile app (Expo) for tenants, caretakers and managers/landlords; push notifications. Broken down into MA-01…MA-12 in `docs/MOBILE_APP_PLAN.md`.
- [ ] M3-02 WhatsApp Business notifications and receipts (opt-in).
- [ ] M3-03 eTIMS integration for receipts/invoices where applicable (subject to L-06).
- [ ] M3-04 USSD channel for tenants without smartphones (balance, pay).
- [ ] M3-05 Digital lease signing (e-signature with audit evidence).
- [ ] M3-06 Analytics: collection trends, tenant payment reliability (internal only, no third-party credit sharing without DPIA + consent).
- [ ] M3-07 Public API + webhooks for accounting integrations (QuickBooks/Xero export).
- [ ] M3-08 Swahili localization.

### Phase 4: Hardening & general availability (overlaps Phase 3)
- [ ] H-01 Independent penetration test (web, API, mobile) and remediation.
- [ ] H-02 Load test: invoice run for 50k units under 10 min; webhook burst of 200 req/s.
- [ ] H-03 Backup restore drill; DR runbook validated (RPO 15m / RTO 4h).
- [ ] H-04 Incident response tabletop exercise, including the ODPC 72-hour breach notification.
- [ ] H-05 Public trust page: security, privacy, status page, uptime SLA.
- [ ] H-06 Support tooling: helpdesk, in-app chat, audited admin impersonation.

## 5. Out of scope (explicitly)
These are out of scope for legal or risk reasons:
- Holding, pooling or disbursing client funds.
- Rent advances or loans.
- Automated eviction, lockouts or distress for rent.
- Sharing tenant data with credit bureaus or other landlords.

Revisit any of these only with an ADR, an advocate's opinion and the relevant licence.

## 6. Success metrics
| Metric | Target (6 months post-GA) |
|---|---|
| Auto-reconciliation rate | ≥ 95% of M-Pesa payments |
| Time to onboard a 20-unit landlord | ≤ 15 minutes |
| On-time collection uplift for pilot landlords | +10 pp vs. their baseline |
| Ledger discrepancies | 0 (nightly verifier) |
| Uptime | 99.9% |
| Critical/high vulns open > 7 days | 0 |
| Paying units | 10,000 |

## 7. Team & roles (lean)
- 1 tech lead/full-stack engineer (owns architecture, security sign-off).
- 1–2 full-stack engineers (Phase 1+), 1 mobile engineer (Phase 3).
- Part-time product designer.
- Part-time QA.
- Outsourced: advocate, DPO, pentest firm.
- Claude Code agents (see `docs/CLAUDE_WORKFLOW.md`) for scaffolding, tests, reviews and docs.

## 8. Delivery process
- 2-week sprints; tasks are the IDs above; each task is one PR.
- Definition of Done:
  - Tests pass, including a cross-org access test for new data.
  - Lint and typecheck are clean.
  - Migrations include RLS.
  - Audit events exist for state changes.
  - Docs are updated.
  - `security-reviewer` has run on PRs touching auth, money, PII or webhooks.
  - `compliance-reviewer` has run on PRs touching PII, notifications, tax or notices.
- Environments: local → staging (sandbox Daraja) → production. Feature flags for gradual rollout.

## 9. Pricing hypothesis (validate in the pilot)
| Plan | Price | Includes |
|---|---|---|
| Starter | Free, ≤ 3 units | Invoicing, M-Pesa reconciliation, receipts, tenant portal |
| Standard | KSh 120/unit/month (min KSh 1,000) | Everything incl. utility billing, reports, MRI report |
| Agency | KSh 100/unit/month (min KSh 5,000) | Multi-landlord, commissions, remittances, landlord portal |
| Enterprise | Custom | SLA, bank integrations, API |

SMS is billed at cost plus a small margin from a prepaid SMS wallet. Kodibox never touches rent money.

## 10. Risks & mitigations
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Daraja production approval delays per landlord paybill | High | High | Start L-05 early; support bank-statement import and manual matching as a fallback |
| Legal reclassification as a payment service provider | Low | High | Reconciliation-only (ADR-0003), advocate opinion (L-01) |
| Data breach of tenant PII | Med | High | `docs/SECURITY.md` controls, encryption, pentest, IR runbook |
| Ledger bugs causing wrong balances | Med | High | Double-entry invariants, property-based tests, nightly verifier |
| Low adoption by small landlords | Med | Med | Free tier, 15-minute onboarding, CSV import from Excel/Bomahut exports |
| Changes to tax rates or law (MRI, Finance Acts) | High | Med | Rates as dated config, not code; yearly review after each Finance Act |
| SMS cost overruns / spam abuse | Med | Med | Prepaid wallet, rate limits, opt-out, template approval |

## 11. Timeline summary
```
Wk 1-3   Phase 0  Foundations + legal
Wk 4-11  Phase 1  MVP → private pilot (Wk 10-11)
Wk 12-19 Phase 2  Differentiators → public beta (Wk 19)
Wk 20-30 Phase 3  Mobile, WhatsApp, eTIMS, USSD
Wk 26-30 Phase 4  Pentest, load, DR → GA (Wk 30)
```
