# Bomahut Teardown and Kodibox Positioning

Research date: 2026-11-02. Sources: bomahut.com (home, /features, /faqs), a competitor-written comparison on nyumbani.ke (biased), web searches. Items marked **[UNVERIFIED]** could not be confirmed from public pages. The Bomahut app (app.bomahut.com) was not logged into.

## 1. Snapshot
- Tagline: "Stop Chasing Rent. Start Earning More." Nairobi-based (NextGen Mall, Mombasa Rd). Contact: newton@bomahut.com, +254 708 403 513.
- Claims: 550+ landlords/managers, 1,000+ properties, 20,000+ tenants; "80% of users saw 20%+ rent collection increase in 3 months" (self-reported, unverified).
- Site structure: /features, /pricing, /faqs, /blogs, /downloads, /tutorial/*, /tools, /affiliates, /team, use-case pages; sign-in at app.bomahut.com.
- Target users: landlords, property managers/agents, service-charge managers, water billing companies, garbage collection companies. Tenants are message recipients (SMS/WhatsApp), not clearly a user type.

## 2. Features (as published)
- Automated rent reminders, invoices, receipts, reconciliation; SMS invoices/receipts.
- Payments: M-Pesa, bank (Equity, KCB, Co-op named), card; auto-posted to tenant accounts; alert when a tenant pays.
- Tenant records and running account balances.
- Arrears views, filters, exportable reports (spreadsheet export); tenant, property and landlord statements.
- Meter-based utility billing (detail only on a separate use-case page).
- Penalties and audit trail.
- WhatsApp communication with tenants; announcements/bulk SMS.
- Free upgrades, backups, SSL in transit, support 8am-7pm EAT (email/phone), training, demo video/booking, affiliate program.

**Not mentioned on features/FAQ pages (treat as absent or undocumented):** tenant portal, native mobile app (a /downloads page exists; contents **[UNVERIFIED]**), role-based access, expense tracking, deposit handling, leases, maintenance requests, KRA/MRI support, eTIMS, public API, funds flow explanation, SMS cost.

## 3. Pricing (KSh/month, all features on every plan)
| Plan | Units | Price |
|---|---|---|
| Basic | 5-20 | 2,500 |
| Standard | 21-50 | 4,500 |
| Premium | 51-100 | 7,000 |
| Enterprise | 100+ | Contact |

One-off fee option for landlords under 20 units (amount **[UNVERIFIED]**). Effective cost: ~125 KSh/unit at 20 units, ~90 at 50, ~70 at 100. SMS and transaction costs not disclosed.

## 4. Onboarding
Free signup, demo video / book demo, tutorials (e.g. "how to add a property"), support-assisted setup. No evidence of bulk import, guided checklist, or free-trial terms **[UNVERIFIED]**.

## 5. Tech hints
SSL, hosted web app, backups. No stated certifications, no mention of ODPC registration or 2FA. Bank/M-Pesa integration probably via paybill C2B and bank notifications **[UNVERIFIED]**.

## 6. Reviews and reputation
- A TrustRadius listing exists; content not retrievable. No Play Store listing found; no independent reviews found.
- Rival Nyumbani says Bomahut has "strong essentials" but is "limited as operations grow" (repairs, visitors, utilities, leases). Biased source.

## 7. Competitors (limited public info)
| Product | Notes | Pricing |
|---|---|---|
| Nyumbani (nyumbani.ke) | Paybill real-time tracking, WhatsApp/SMS/email reminders, repairs, utilities, visitors, short-stay, digital leases, diaspora dashboards | not found |
| Nyumba Zetu | Large, formal-org suite; heavier setup (per Nyumbani) | not found |
| Rent-Rahisi | Since 2017; rent automation | ~KSh 20,000/yr (2021 article) |
| Juice Palm RMS | M-Pesa + all banks auto-recording; one-time license | not found |
| Makao | Tenant vetting/contributions; free 1-10 units, KSh 1,500/mo for 11-50, +1.5% on contributions | as listed |
| WinguRent, FutureSoft, Rentyla | Mentioned only | not found |

Zuru, Rentrack, Kodi: nothing verified in search; not included.

## 8. Feature matrix (Bomahut per published pages; Nyumbani per its own claims)
| Capability | Bomahut | Nyumbani | Kodibox target |
|---|---|---|---|
| Tenant/unit mgmt | Y | Y | Y |
| Invoicing + receipts | Y | Y | Y (eTIMS-aware) |
| M-Pesa auto-reconcile | Y | Y | Y (STK + C2B) |
| Bank reconcile | Y (3 banks) | ? | Y (statement import + API) |
| SMS reminders | Y | Y | Y + WhatsApp + email |
| Water/meter billing | Y | Y | Y (photo meter reads) |
| Penalties | Y | ? | Y (lease-linked, configurable) |
| Deposits | N | ? | Y (ledger, refund workflow) |
| Expenses/owner payouts | N | ? | Y |
| Tenant portal / app | N | partial | Y (PWA, USSD/SMS-link fallback) |
| Roles (caretaker etc.) | N | ? | Y |
| Maintenance tickets | N | Y | Y |
| Leases / e-sign | N | Y | Y |
| KRA MRI report | N | ? | Y |
| Public API/webhooks | N | ? | Y |
| Audit trail | Y | ? | Y (immutable) |

## 9. Weaknesses and gaps in Bomahut
1. Tenant side is passive: no portal/app, no self-service statements or receipts.
2. No deposits, expenses, owner payouts, or lease lifecycle (move-in/out, renewals, notices).
3. No maintenance/work-order flow; no caretaker role or permissions.
4. No Kenyan tax tooling: MRI schedule, eTIMS, landlord annual summaries.
5. Opaque on payment setup, transaction/SMS costs, and who holds funds.
6. Unit-based tiers are steep for small landlords (5 units = KSh 2,500, i.e. 500/unit) unless one-off.
7. Thin trust signals: no compliance statements (ODPC), no status page, no verifiable reviews; "no downtime" claim.
8. Utility billing is buried; no evidence of tiered tariffs or missed-read handling.
9. Limited analytics beyond arrears lists and exports.
10. Mobile experience for caretakers in low-connectivity areas unknown.

## 10. How Kodibox wins
- **Tenant-first:** installable PWA plus SMS-link/USSD flows; STK push in two taps; instant PDF receipt; own statement and deposit view.
- **Caretaker mode:** offline-capable meter readings with photo evidence, collections log, maintenance tickets, limited-permission roles.
- **Full lifecycle:** lease, deposit ledger, move-out inspection and deductions, renewals, notice templates (see legal doc).
- **Tax-ready:** per-landlord MRI schedule (7.5% of gross residential rent, see legal doc), annual statement, eTIMS-aligned receipts where needed.
- **Never hold funds:** collect straight into the landlord's paybill/till/bank; Kodibox only reconciles. Market this as a safety feature.
- **Transparent pricing:** public pricing, free or cheap entry tier for small landlords (<=5 units), SMS bundled or at cost, no hidden fees.
- **Owner/agent portal:** multi-owner statements, commission calc, remittance reports, diaspora dashboards.
- **Trust:** ODPC registration badge, 2FA, immutable audit log, status page, export anytime.
- **Smarter automation:** configurable reminder cadences, allocation rules (rent vs water vs penalty), unmatched-payment queue with suggested matches.
- **Onboarding:** Excel/CSV import, 10-minute setup checklist, free trial, WhatsApp support.
- **Integrations:** webhooks/API, accounting export, WhatsApp Business.

## 11. Open items to verify
Bomahut /pricing one-off fee, /downloads contents, app store presence, TrustRadius ratings, reconciliation mechanism, SMS pricing; competitor pricing (Nyumbani, Zuru, Rentrack, Kodi) via demo accounts.
