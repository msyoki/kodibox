---
name: kenya-compliance
description: Checklist for when a Kodibox feature touches personal data, money flow, notifications, tax reporting, or receipts, with pointers to Kenyan legal docs (DPA 2019, KRA MRI, eTIMS, SMS opt-out, retention). Use when designing or reviewing any feature that collects PII, sends SMS/email, produces tax or statement output, or moves payment data.
---
# Kenya compliance

This is an engineering checklist, not legal advice. Facts, rates, and deadlines live in `docs/research/legal-compliance-kenya.md` and `docs/PRIVACY_BY_DESIGN.md`; Grep them for the topic rather than reading whole files. Anything marked "verify" there must be confirmed with counsel or the current regulator text before launch. Never hard-code a tax rate; read it from versioned config that cites the doc.

## Trigger table: what must you check?
| The feature... | Check |
|---|---|
| Collects or stores a new personal field (name, phone, ID, KRA PIN, email, photo, location) | Data minimisation; lawful basis + purpose recorded; field-level encryption and masking for ID/KRA PIN/phone; retention period; add to the data inventory in docs/PRIVACY_BY_DESIGN.md |
| Shares data with a vendor (SMS, email, storage, analytics, Sentry) | Processor listed; contract/DPA; cross-border transfer basis; no PII in telemetry |
| Shows tenant data to a caretaker, manager, or another tenant | Role scope via `can()`; least privilege; audit access to sensitive fields |
| Sends SMS or email | Lawful basis; transactional vs marketing separated; marketing needs opt-in and STOP opt-out honoured within one send; sender ID; quiet hours |
| Handles a payment or payout | Never hold funds (CBK NPS Act); funds go to landlord's own paybill/till/bank; any exception requires an ADR plus legal review |
| Generates a statement, receipt, invoice, or tax report | KRA MRI figures and eTIMS requirements; accurate, immutable, traceable to ledger postings |
| Deletes or exports data | Data subject rights flow (access, correction, erasure, portability) with legal-hold and tax-record retention exceptions |
| Handles deposits, eviction notices, rent increases | Landlord-tenant law alignment; deposits as a liability; notices use statutory wording from the docs |
| Introduces a data breach surface (new endpoint, bucket, export) | Breach response hooks; ODPC notification timeline per docs |

## Data Protection Act 2019 essentials
- Principles: lawfulness, purpose limitation, minimisation, accuracy, storage limitation, security, accountability.
- Consent where used must be specific, informed, recorded (who, what, when, version of notice), and withdrawable as easily as given. Prefer contract/legal-obligation bases for lease and billing data and document them.
- Rights to support: be informed, access, rectification, erasure, object, portability. Build an admin-assisted DSAR export from day one.
- Sensitive/identifier data (national ID, KRA PIN, phone) is encrypted at the app layer and masked as `***1234` in UI and logs.
- Registration with the ODPC as controller/processor, DPIA for high-risk processing: track as tasks in docs/PROJECT_PLAN.md.

## Tax notes
- Residential rental income tax (MRI) applies to landlords; Kodibox produces reports and schedules, it does not remit. The rate, thresholds, and filing deadline MUST be read from docs/research/legal-compliance-kenya.md and verified current before use; keep them in config with an effective-from date.
- eTIMS: check the research doc for whether the organization or its landlords must issue eTIMS-compliant receipts or invoices; integration lives in `packages/integrations/etims`. Keep a stable invoice number series per organization and store the KRA response (control code/QR) with the document.
- Landlord statements must reconcile to ledger totals exactly (no recalculation outside `packages/core`).

## SMS and notifications
Record `consent_status`, `source`, `timestamp` per contact and channel. Inbound STOP (and local-language equivalents listed in the docs) flips the marketing flag immediately and writes an audit event. Rent reminders and receipts are transactional but still need a lawful basis and a way to correct the number.

## Retention
Periods are in docs/SECURITY.md and docs/PRIVACY_BY_DESIGN.md. Implement as a worker job that anonymises or deletes after the period, except records under tax or legal hold (financial records are typically retained for years: confirm the exact figure in the docs). Ledger rows are never deleted: anonymise the linked person instead.

## Done-when
Before finishing a feature that matched the table: lawful basis noted, encryption/masking confirmed, retention defined, opt-out path tested, docs updated via docs-writer, then run `compliance-reviewer`.
