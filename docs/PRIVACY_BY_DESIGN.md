# Kodibox Privacy by Design (Kenya Data Protection Act, 2019)

Status: v1 draft. **[LEGAL]** marks points needing confirmation from a Kenyan data protection lawyer. Technical controls live in `docs/SECURITY.md`.

## 1. Roles: controller and processor

| Data | Controller | Processor | Notes |
|---|---|---|---|
| Tenant, lease, payment and property data entered or collected by a landlord org | Landlord organization (owner/agent) | Kodibox | Org decides purposes (managing tenancy, rent collection, tax) |
| Kodibox customer accounts (org users, billing, login and security logs, product analytics) | Kodibox | Cloud, SMS, email vendors | Kodibox sets purposes and means |
| Marketing to tenants sent through the platform | Landlord org | Kodibox | Kodibox provides the tool only |

- Where a property manager/agent acts for a landlord, the agent may be a joint controller or a processor of the landlord; the org setup captures which **[LEGAL]**.
- A **Data Processing Agreement (DPA)** is mandatory under s.42 and the 2021 Regulations: accepted in-app at org signup (versioned, timestamped, signatory recorded) and listed with sub-processors (cloud host, KMS, Africa's Talking, Resend/SES, Sentry, Safaricom Daraja as data source). Must cover: instructions-only processing, confidentiality, security measures (refer to SECURITY.md), sub-processor approval and notice, assistance with data subject requests, breach notice within 24 h of confirmation, deletion/return at termination, audit rights.
- Sub-processor list is public; customers get 30 days notice of changes.

## 2. DPA 2019 principles (s.25) mapped to features

| Principle | Product feature / rule |
|---|---|
| Lawfulness, fairness, transparency | Privacy notice per org (template Kodibox supplies), shown in tenant onboarding and portal; consent and basis recorded per purpose |
| Purpose limitation | Each data field tagged with purpose in the data model; no use of tenant data for Kodibox's own marketing or analytics; exports labelled by purpose |
| Data minimisation | Required fields only: name, phone, unit; national ID and KRA PIN optional unless the org needs them (e.g. for lease or eTIMS), with in-form "why we ask"; no photos of ID unless org enables it |
| Accuracy | Tenant can view and request correction in portal; change history in audit log; phone verification by OTP |
| Storage limitation | Retention schedule (SECURITY.md s.10) enforced by a retention worker; pseudonymisation after lease end where financial records must remain |
| Integrity and confidentiality | Envelope encryption, RLS, masking, RBAC, audit (SECURITY.md) |
| Accountability | Records of processing (RoPA) maintained per feature; DPIAs; audit logs; DPO appointed **[LEGAL]** |
| Data protection by design and default (s.41) | Defaults: PII masked, marketing off, minimal fields, shortest retention, least-privilege roles, caretaker scoped to assigned properties |
| Cross-border limits (ss.48-50) | See section 8 |
| Rights (s.26) | Section 5 |
| Children | No tenants under 18 on leases; occupants' minors' data not collected beyond a headcount **[LEGAL]** |

## 3. Lawful basis per data category

| Category | Lawful basis (s.30) | Details |
|---|---|---|
| Tenant identity and contact (name, phone, email), lease terms, unit assignment | Performance of a contract (the tenancy) | Necessary to administer lease, invoice and communicate |
| Rent payments, invoices, receipts, ledger | Contract, plus legal obligation | Tax and accounting duties |
| KRA PIN, eTIMS data, financial records | Legal obligation (Tax Procedures Act, Income Tax Act, VAT) **[LEGAL]** | Retained 7 years |
| National ID number/scan | Contract or legal obligation depending on org use; otherwise legitimate need documented in DPIA **[LEGAL]** | Collected only if org enables; consider whether ID number alone suffices without a scan |
| Service SMS/email (rent due, receipts, maintenance) | Contract (service messages) | No opt-in needed but opt-out of non-essential reminders offered |
| Marketing messages (promotions, third-party offers) | Consent (explicit, opt-in) | Separate from lease; STOP honoured; withdrawable any time |
| Credit referencing / sharing arrears with a credit reference bureau or blacklist | Consent, or legal basis per Credit Reference Bureau Regulations **[LEGAL]** | Off by default; never silent; requires notice with consequences and a dispute path |
| Repair and complaint tickets (description, photos and video, thread, rating) | Contract (repairs and service); legitimate interests for complaint handling **[LEGAL]** | Minimise; role-based visibility; EXIF stripped from media; abusive messages hidden (audited), not censored |
| Third-party data in complaints (neighbours, caretaker, staff, manager; `subject_party_note`) | Legitimate interests (handling the complaint) **[LEGAL]** | Collect only what the complaint needs; identity can be hidden from the other party; never used to trigger penalties, eviction or notices |
| Sensitive personal data (s.2: health, ethnic origin, children's data, etc.) | Explicit consent or specific exceptions | Avoided by design; maintenance notes must not capture health data; free-text fields carry a warning |
| Kodibox customer account data | Contract; legitimate interests for security logging; consent for product marketing | |
| Security and audit logs | Legitimate interests / legal obligation | Minimal PII (masked) |

Ticket retention: tickets are kept for 2 years after closure **[LEGAL]**, or longer where linked to a dispute or financial record (credit note, reversal, invoice). Data subject export includes the tenant's own tickets and redacts other parties' names and identities. Complaints never trigger penalties or eviction steps.

Rule: no feature may process a category without an entry in the lawful-basis register (`docs/` RoPA) and a purpose tag in code.

## 4. Consent capture UX

- Consent is **unbundled**: separate unchecked checkbox per purpose (marketing SMS, credit referencing, optional photo sharing). Never pre-ticked; never a condition of the lease unless strictly necessary.
- Plain English and Kiswahili, 1-2 sentences, with "what, why, who sees it, how to withdraw" and link to the full notice.
- Recorded in `consents`: subject, purpose, wording version, language, channel (web, app, SMS reply, paper scanned), timestamp, IP/UA or collector user id, evidence reference, status, withdrawal time.
- Paper or verbal consent captured by a caretaker is stored as pending and confirmed by the tenant by OTP/SMS link before it becomes valid.
- Withdrawal is as easy as giving it: portal toggle, SMS `STOP`, or request to the org. Effect is immediate; downstream jobs check consent at send time.
- Re-consent prompts when wording or purpose changes.
- Tenants who are not yet portal users get a short SMS notice with the privacy-notice link at first contact **[LEGAL]**.

## 5. Data subject rights flows

Request channels: tenant portal "My data", email to org and Kodibox privacy address, paper via caretaker (logged). Identity verified before action (logged-in session plus OTP, or manual check for others). Requests are tracked in a `dsr_requests` table with owner, type, status, due date, audit trail.

**Roles:** the landlord org (controller) is responsible for deciding; Kodibox (processor) forwards requests received directly to the org within 2 business days and supplies tooling. For Kodibox customer account data, Kodibox decides.

| Right | Flow | SLA |
|---|---|---|
| Access (s.26(b)) and portability | Portal "Download my data" or org staff triggers export: profile, leases, ledger, payments, messages, consents as JSON + PDF/CSV, delivered by signed link; excludes other people's data and fraud-investigation material | Acknowledge 3 days; fulfil within 30 days (target 7) **[LEGAL]** (DPA Regulations: 7 days for some rights, confirm) |
| Rectification (s.26(d)) | Tenant submits correction in portal; org staff approve or correct; ledger amounts are never edited, disputes handled via reversing entries and notes | 14 days |
| Erasure (s.26(e)) | Request reviewed by org with a checklist: active lease? outstanding balance? tax retention duty? legal hold? If none, delete PII and ID scans; otherwise **pseudonymise** and restrict, telling the tenant what is kept and why (e.g. financial records 7 years). Nothing is deleted under legal hold. Backups age out; erasure ledger prevents restore of erased data | 30 days |
| Objection (s.26(c)) | Opt-out of marketing, credit referencing and non-essential processing is immediate; objection to contract-based processing is reviewed by org | Immediate for marketing; 14 days otherwise |
| Restriction | Flag record `restricted` to stop non-essential processing while a dispute is resolved | 14 days |
| Automated decisions (s.35) | None that significantly affect a tenant; late-fee calculation is rule-based and explained; credit scoring features need DPIA and human review | n/a |
| Complaint | Notice explains right to complain to the ODPC | n/a |

Refusals are reasoned, recorded and communicated in writing. Fulfilment steps are audited.

## 6. Data Protection Impact Assessment (DPIA)

Required (s.31) before processing likely to result in high risk, and for every feature in these classes: ID scan collection, credit referencing/arrears sharing, large-scale tenant profiling or scoring, biometric or location data, new integration receiving PII, mobile app launch, any new use of tenant data for analytics, platform-admin support access, and a substantial change in cross-border flows. The overall platform gets one DPIA before launch.

**Template outline**
1. Description: feature, data flows (diagram), categories, data subjects, volumes, systems, processors.
2. Purpose and lawful basis; necessity and proportionality (why this data, why not less).
3. Stakeholder consultation (landlord reps, tenants, DPO, security).
4. Risk identification: likelihood and severity for data subjects (discrimination, fraud, identity theft, loss of housing, distress), including STRIDE references.
5. Mitigations: technical (SECURITY.md controls), organisational, contractual; residual risk rating.
6. Rights handling and retention for this feature.
7. Cross-border transfer analysis.
8. Sign-off: DPO, product owner, security lead; decision (proceed, proceed with conditions, stop); review date.
9. If high residual risk, consult the ODPC before processing.

DPIAs are stored in `docs/dpia/` (one per feature, versioned) and linked from the PR.

## 7. Privacy engineering rules for developers

- Data model: every PII column has a classification, purpose and retention tag; CI checks new columns include them.
- Masked by default in UI; reveal is an audited action requiring `pii:reveal`.
- No PII in URLs, logs, analytics events, error reports, or test fixtures (synthetic data only).
- Analytics: product analytics are aggregate and exclude tenant PII; no third-party ad trackers or session replay on authenticated pages.
- Notifications check consent/basis at send time.
- New field or purpose requires update to RoPA and privacy notice template.
- Org offboarding: export for the controller, then deletion after 30 days (crypto-shredding of org DEK after backups expire).

## 8. Cross-border transfers

- DPA ss.48-50 and Regulations: transfers allowed with adequate safeguards or the subject's consent; certain data may need processing in Kenya (strategic interest, and the 2021 Regulations list e.g. administering civil registration, revenue) **[LEGAL]**.
- Prefer hosting primary data in a region with Kenyan or near-region presence. Cloud providers' African regions (Cape Town) are preferred over EU/US; if data is stored outside Kenya, rely on contractual safeguards (DPA with SCC-style terms) and tell data subjects in the notice **[LEGAL]**.
- Sub-processors outside Kenya (email, error tracking, SMS aggregator) get minimal PII; Sentry is scrubbed; list countries in the sub-processor register.
- Encryption keys stay in a KMS region chosen with the same analysis; keys never leave KMS.
- Any transfer of Kodibox support staff access from abroad is covered by the same rules.

## 9. ODPC registration and governance

- Registration with the Office of the Data Protection Commissioner is mandatory for controllers and processors meeting the thresholds in the 2021 Registration Regulations; Kodibox registers as **both data controller (account data) and data processor (tenant data)** before launch **[LEGAL]**. Renewal annually; track the date.
- Landlord orgs that are controllers also need registration depending on size and data; Kodibox onboarding explains this and links to the ODPC portal. Whether small individual landlords are exempt must be confirmed **[LEGAL]**.
- Appoint a Data Protection Officer (internal or outsourced) with a published contact (privacy@kodibox.co.ke placeholder).
- Maintain: RoPA, DPIAs, DPAs and sub-processor register, breach register, DSR log, staff training records, consent records.
- Annual privacy review, aligned with the security review; ODPC audit readiness pack kept current.

## 10. Open questions for legal

1. Confirm lawful basis and necessity for collecting ID scans, and deletion window after lease end.
2. Controller/processor classification of property managers acting for landlords.
3. DSR response timelines under the 2021 Regulations.
4. Data localisation constraints and acceptable transfer mechanism for hosting outside Kenya.
5. Credit referencing and arrears-sharing rules (CRB regulations) before any such feature ships.
6. Registration thresholds and exemptions for small landlords and for Kodibox.
7. Handling of occupants who are minors and non-lessee occupants.
