# Kenya Legal and Compliance Notes for Kodibox

**Disclaimer:** These are research notes, not legal advice. A Kenyan advocate must review them before launch. Date: 2026-11-02. Items marked **[CHECK]** come from general knowledge or unconfirmed sources and need verification against primary sources (Kenya Law, ODPC, KRA, CBK, Communications Authority).

## 1. Data Protection Act 2019 (DPA) and Data Protection (General) Regulations 2021
| Topic | Requirement | Product implication |
|---|---|---|
| Registration (s.18; Registration of Data Controllers and Processors Regs 2021) | Controllers and processors register with ODPC; exemptions depend on size/sector **[CHECK]**. Processing rent and financial data at scale will likely require registration. | Register Kodibox as processor (and controller for its own account/billing data). Landlords/agents are controllers of tenant data; include a Data Processing Agreement in ToS. Show registration number. |
| Principles (s.25) | Lawfulness, purpose limitation, minimisation, accuracy, storage limitation, security. | Collect only needed fields; retention schedule. |
| Lawful basis (s.30) | Consent, contract, legal obligation, legitimate interest. Sensitive data has stricter rules (s.44). | Tenant data processed under tenancy contract basis; marketing and credit/reference sharing need explicit opt-in. |
| Consent | Specific, informed, unbundled, withdrawable. | Separate toggles with timestamps; withdrawal at any time. |
| Data subject rights (s.26, s.40) | Access, rectification, erasure, objection, portability. | Self-service tenant data export; erase/anonymise on request subject to legal retention. |
| Notice (s.29) | Tell subjects purposes, recipients, transfers, rights. | Privacy notice on tenant invite and first SMS link. |
| Breach (s.43) | Notify ODPC within 72 hours; notify data subjects without undue delay where high risk. | Incident runbook, breach register, alerting, notification templates. |
| Cross-border (ss.48-50; Regs reg. 26-27) | Needs safeguards, adequacy or consent; some categories must be processed in Kenya **[CHECK scope]**. | Prefer Kenya/nearby hosting if feasible; otherwise document safeguards and list vendors (SMS, WhatsApp, email, cloud) in privacy notice. |
| DPIA (s.31) | Required for high-risk processing (large scale, profiling, new tech). | Do a DPIA before launching tenant scoring/reference features. |
| DPO | Designate where large-scale or sensitive processing. | Appoint DPO contact. |
| Penalties | Fines up to KSh 5m or 1% of turnover **[CHECK]**. | Treat as material risk. |
| National ID numbers | High-risk identifier. | Encrypt, mask in UI, restrict by role. |

## 2. Landlord and tenant law
- **Landlord and Tenant (Shops, Hotels and Catering Establishments) Act, Cap 301:** applies to controlled business premises, not residential. Governs termination/variation notices and the Business Premises Rent Tribunal. Product: tag units residential vs commercial; use Cap 301-style notice templates for commercial; periods **[CHECK]**.
- **Rent Restriction Act, Cap 296:** protects residential tenants in low-rent dwellings (commonly cited threshold monthly rent up to KSh 2,500 **[CHECK]**); Rent Tribunal handles rent and eviction disputes. Product: flag units under threshold, warn on rent increases, no automated evictions.
- **Distress for Rent Act, Cap 293:** landlord may seize goods via licensed auctioneer under strict conditions. Product: do NOT automate distress, lockouts or seizure threats. Reminders must be factual and non-harassing; formal notices are advocate-reviewed drafts only.
- **Landlord and Tenant Bill / rent regulation proposals:** several bills have been proposed over the years; current status **unverified**. Design a configurable rules table (notice periods, deposit rules, rent increase rules) rather than hard-coded law.
- Deposits: no comprehensive residential deposit statute known **[CHECK]**; practice is 1-2 months. Keep a transparent deposit ledger. Self-help evictions are unlawful; evictions need a court/tribunal process.
- Digital leases and e-signatures: recognised under KICA Part VIA; admissibility of electronic records under Evidence Act s.106B **[CHECK]**. Keep tamper-evident logs.

## 3. KRA taxes
- **Monthly Rental Income (MRI) tax, Income Tax Act s.6A:** residential rental income of KSh 288,000 to 15,000,000 per year; **7.5% of gross rent**, no expense deductions (reduced from 10% effective 1 Jan 2024); return and payment due by the **20th of the following month**. The Finance Bill 2026 proposed 10%, but reporting indicates the **enacted Finance Act 2026 (assented 23 June 2026, mostly effective 1 July 2026) retained 7.5%**; the enacted s.6A text was not directly confirmed, so **verify in KRA's Finance Act 2026 PDF**. The Act also reportedly adds a separate non-resident rental regime (reported rate 30% per EY vs 10% in a bill analysis) **[CHECK]**.
- Commercial rent is outside MRI; taxed as business income and may attract withholding tax and VAT (16%) where the landlord is registered **[CHECK]**.
- KRA launched **eRITS** in 2025 and is targeting landlords/agents. Product: do not file on behalf of users at first; produce monthly gross-rent schedule, MRI amount, landlord KRA PIN, and export for eRITS/iTax **[CHECK formats]**.
- **eTIMS:** required for VAT/business supplies; residential rent is VAT-exempt. Whether residential landlords must issue eTIMS invoices **[CHECK]**. Support eTIMS for VAT-registered/commercial landlords; issue sequential numbered receipts for all.
- Record retention: Tax Procedures Act requires 5 years **[CHECK]**.

## 4. Payments
- **Safaricom Daraja:** STK Push (Lipa na M-Pesa Online), C2B (paybill/till with validation and confirmation URLs), B2C, Transaction Status, Account Balance, Reversal. Norms: each shortcode has its own credentials (consumer key/secret, passkey), so onboard a **per-landlord shortcode**; HTTPS callbacks; idempotent handling of duplicate/late callbacks; C2B URL registration and go-live approval from Safaricom; limits **[CHECK]**.
- **Banks:** Equity Jenga, KCB Buni, Co-op Open API, I&M etc. generally need commercial onboarding. Alternatives: statement import, notification parsing, or licensed aggregators (Pesapal, Flutterwave, IntaSend, DPO) **[CHECK terms]**.
- **National Payment System Act 2011 and Regulations 2014 (CBK):** holding or transmitting customer funds needs CBK authorisation as a payment service provider. Collection on behalf of others normally means a PSP licence or partnering with a licensed PSP. **Digital credit** (rent advances/loans) requires a CBK Digital Credit Provider licence (CBK Amendment Act 2021).
- AML: Proceeds of Crime and Anti-Money Laundering Act (POCAMLA); PSP partners handle KYC; keep transaction logs.
- **Product rules:** (1) default flow pays directly into the landlord's own paybill/till/bank, Kodibox reconciles only; (2) pooled collection only via licensed PSP, never Kodibox balances; (3) no lending without licence; (4) never store M-Pesa PINs or card data (use PCI gateway).

## 5. Cyber, consumer and communications law
- **Computer Misuse and Cybercrimes Act 2018:** offences for unauthorised access, data interference, false publication, cyber harassment. Product: strong authentication, access logs, vulnerability disclosure policy, no harassing message content; process lawful preservation/production orders.
- **Consumer Protection Act 2012:** clear pricing, fair terms, no misleading claims. Product: transparent pricing, plain-language ToS, easy cancellation and export; avoid unsubstantiated marketing claims.
- **KICA 1998 and Communications Authority guidance:** SMS sender IDs must be registered with the operator/aggregator; promotional messages need opt-out; quiet-hours guidance **[CHECK specifics]**. Product: separate transactional vs promotional classes, STOP handling, sender ID per landlord or shared ID with landlord name in body, delivery logs.

## 6. Design implications
1. Never hold funds; per-landlord shortcode; reconciliation only.
2. Immutable append-only audit log (actor, action, before/after, IP, time) for payments, edits, deposits, notices.
3. Retention: financial records 5-7 years; tenant personal data deleted/anonymised within a defined period after tenancy end (e.g. 12-24 months) **[CHECK with advocate]**.
4. Consent records for marketing and credit/reference sharing; tenant references are opt-in and contestable; no public tenant blacklists.
5. Role-based access; caretakers cannot see full ID numbers or landlord financials.
6. Encryption in transit and at rest; field-level for IDs and phones; 2FA for landlords/agents; tested backups.
7. Data-subject request tooling with response SLA (DPA timeline **[CHECK]**).
8. Vendor register and DPAs (SMS, WhatsApp, email, cloud).
9. Configurable legal rules table (notice periods, deposit rules, residential vs controlled premises).
10. No automated eviction/distress/lockout features.
11. SMS class separation, opt-out, quiet hours.
12. Substantiate marketing claims.

## 7. Compliance checklist
- [ ] ODPC registration (controller and processor); DPO named; DPIA completed
- [ ] Privacy notice, ToS, landlord DPA, cookie notice
- [ ] Breach plan (72h) and register
- [ ] Hosting/cross-border safeguards documented
- [ ] Consent capture/withdrawal and data-subject request flows
- [ ] Retention and deletion jobs
- [ ] Daraja per-landlord onboarding and go-live checklist; idempotent callbacks
- [ ] Legal opinion that the reconciliation-only model needs no CBK PSP licence; PSP partner if pooling
- [ ] Verify s.6A 7.5% in Finance Act 2026; MRI report; eTIMS decision
- [ ] SMS sender ID registered; opt-out; transactional vs promotional
- [ ] Lease/notice templates reviewed by advocate (Cap 301, 296, 293)
- [ ] Penetration test, secure SDLC, vulnerability disclosure policy
- [ ] Advocate review of this entire document

## 8. Sources consulted
KRA eRITS FAQ and Finance Act 2026 (kra.go.ke); EY, RSM, ENSafrica and KPMG alerts on Finance Act 2026; Kenyans.co.ke coverage. All statute section numbers beyond MRI are from memory and flagged for verification.
