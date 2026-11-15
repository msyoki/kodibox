# 0007. Payment-agnostic reconciliation (no direct payment-rail integrations)

- Status: Accepted
- Date: 2026-11-14
- Amends: 0003 (removes STK Push, C2B and bank callbacks as the way Kodibox "reads" payments)

## Context
The plan so far had Kodibox detect payments itself: per-landlord Safaricom Daraja credentials, C2B URL registration and confirmation webhooks, Transaction Status re-checks, STK Push "pay now", and bank callbacks. That gives instant recognition, but each rail brings:

- **Integration cost:** Daraja go-live approval per landlord paybill (weeks, often the top onboarding blocker), separate work for every bank, and sandbox/production differences.
- **Complexity and attack surface:** encrypted storage of third-party credentials, internet-facing webhooks (IP allowlists, secret paths, idempotency, replay handling), and a retry pipeline.
- **Ongoing maintenance:** API version changes, certificate rotation, callback outages and per-bank format drift, all of which become our incidents.
- **Coverage gaps anyway:** cash, cheques, agent deposits, Pesalink, card payments and transfers from other banks never reach a webhook, so manual reconciliation is needed regardless.

Landlords already have statements from their paybill, till and bank. What they lack is the work of matching those statements to tenants, invoices and arrears. That work is the product.

## Decision
Kodibox is a **payment-agnostic** property management system. It does not collect, initiate or detect payments. It **reconciles** payment evidence that the landlord or tenant brings in.

1. **No direct rail integrations.** There is no Daraja (STK Push, C2B, Transaction Status), no bank APIs or callbacks, and no payment webhooks. Kodibox never stores payment-rail credentials.
2. **Payment evidence sources** (all go through the same pipeline):
   - **Statement import:** M-Pesa paybill/till statements (CSV/XLSX export from the M-Pesa business portal) and bank statements (CSV/XLSX, OFX later). Known layouts are parsed automatically; anything else uses a saved column-mapping template per org and account.
   - **Tenant-submitted proof:** the tenant pastes the M-Pesa confirmation SMS or uploads a bank slip or receipt photo. It is parsed (transaction code, amount, date, account) and held as a **claim**, pending verification, until a statement line confirms it or a manager approves it.
   - **Manual entry:** cash, cheque or deposit, with maker-checker approval when a caretaker enters it.
3. **Reconciliation engine** (pure, in `packages/core/reconciliation`, 100% unit-tested):
   - Normalise each line into a `PaymentRecord` {source, externalRef, amount (minor units), currency, paidAt, payer name/phone (hashed for matching), account reference, raw line (encrypted)}.
   - **Deduplicate** on (org, source account, externalRef, such as the M-Pesa transaction code or bank reference), with an amount+date fingerprint fallback. Re-importing the same statement is a no-op, and a tenant claim plus the statement line for the same payment merge into one record.
   - **Match** with confidence scoring: account reference = unit code or lease reference, then a known payer phone or name, then amount ≈ open balance within a date window. Above the auto threshold it allocates oldest-first, and any overpayment becomes tenant credit. Below the threshold it goes to the **unmatched queue** for one-tap confirm, split or reassign.
   - Every match, allocation, split and reversal posts through the double-entry ledger (ADR 0004) and writes `audit_events`.
4. **Paying rent stays outside Kodibox.** Tenants see the landlord's own payment instructions: paybill/till number, the exact account reference to use (their unit code), and bank details. Each has a copy button. Using the right account reference is what makes auto-matching work, so the instructions, invoices, reminders and receipts all repeat it.
5. **Extension point, not a commitment.** Statement parsers and any future feed implement one `PaymentSource` interface in `packages/integrations/payment-sources`. A direct rail feed may be added later only through a new ADR, as an optional per-org plug-in that produces the same `PaymentRecord`s.

## Consequences
- **Removed scope:** Daraja production approvals (L-05 shrinks to SMS sender IDs), credential vaulting for payment rails, the payment webhook endpoint and its security controls, the STK pay flow, and webhook retry jobs. The never-hold-funds position (ADR 0003) gets stronger, because Kodibox no longer even initiates payments.
- **Recognition is batch, not instant.** A payment shows up when the statement is imported or a tenant claim is approved, not seconds after payment. Mitigations:
  - tenant claims show as "pending verification" straight away
  - an import reminder nudges the landlord (daily or weekly, configurable) with the count of open claims
  - penalties and arrears reminders exclude tenants with a pending claim inside the grace window
- **Statement files contain personal data** (payer names and phone numbers). Raw files and lines are stored encrypted with retention per `docs/SECURITY.md`, imports are permission-gated and audited, and phone numbers are hashed for matching and masked in the UI.
- **Parser maintenance is cheaper than API maintenance.** A format change breaks one parser with a clear error and a column-mapping fallback, not a live integration.
- **Onboarding is faster:** landlords enter their payment instructions and upload their first statement, with no third-party approval.
- **Docs, plans and prototypes change:** CLAUDE.md rule 7, ARCHITECTURE, SECURITY, PROJECT_PLAN (M1-06 to M1-09, M2-01, L-05), MOBILE_APP_PLAN, DATA_MODEL, the `mpesa-daraja` skill, and the web and mobile pay screens.

## Addendum (2026-11-15): review of the "universal reconciliation engine" recommendation
An external recommendation proposed the same architecture: one common transaction format, matching that is independent of the institution, and a platform that manages rental accounting rather than money movement. Points it added, now adopted:

1. **Notification forwarding as a fourth evidence source (Phase 2+).** Landlords may forward payment notifications (M-Pesa or bank alert emails) to a per-org inbound address, or upload them. They are parsed into `PaymentRecord`s with `source: 'notification'` and `status: 'unverified'`, the same trust level as tenant claims. Email can be spoofed: accept only from addresses the org registers, require SPF/DKIM alignment, rate-limit, and never auto-verify. They confirm only when a statement line matches, or the owner approves.
2. **Property-prefixed account references.** A unit code alone (`B-12`) can collide when several properties share one paybill. Account references become `<PROPERTY_CODE>-<UNIT>` (for example `GV-B12`), unique per org and payment source. Legacy unit-only references still match when they are unambiguous within the source. Pay instructions, invoices and reminders show the prefixed form.
3. **Transaction-level reports only.** Some bank statements show paybill settlements as one aggregated line per day, which cannot identify tenants. The importer detects this (few large credits, a "settlement" or "M-PESA C2B" narrative) and tells the landlord to upload the M-Pesa organisation portal transaction report instead. Aggregated lines are never matched to tenants.
4. **Reversals and refunds.** M-Pesa `Linked Transaction ID` reversals and bank reversal or refund lines post ledger reversing entries against the original allocation. They never delete or update records.
5. **PDF statement extraction (later).** Text-based PDFs only, behind the same parsers and limits, with no OCR in v1.
6. **Optional rail integrations stay optional.** This is unchanged from "Extension point": allowed only through a new ADR, never a dependency.

Accepted and already covered: partial payments, multiple payments per invoice, one payment covering several invoices (oldest-first allocation plus credit), duplicate detection, unidentified payments (unmatched queue), never matching on amount alone, and unverified tenant declarations staying pending until independently confirmed.

**Acceptance criteria for the real server actions** (from security review round 3, prototype-only findings):
- Claim approval is blocked while a verified record with the same dedupe key exists. A review claim is settled by linking it to that record, never by a fresh allocation.
- Approver ≠ claimant and approver ≠ maker, enforced with `can()` on the server.
- Receipt and claim endpoints check that the lease belongs to the actor (no IDOR).
- A conflict row needs a reversal of the original, or a step-up approval, before it can be assigned.
- Parsing and phone hashing (keyed HMAC) run server-side or in the worker. Raw lines never reach the client.

Pricing note (business, not architecture): plans are tiered by units and reconciliation features. Tenants are never charged to report a payment.
