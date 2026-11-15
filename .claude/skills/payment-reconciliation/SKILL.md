---
name: payment-reconciliation
description: Payment-agnostic reconciliation for Kodibox (ADR 0007) - statement import (M-Pesa paybill/till and bank CSV/XLSX), tenant payment claims (pasted M-Pesa SMS / slip), manual entries, dedupe, confidence matching, oldest-first allocation via the ledger, unmatched queue, PII rules and fixtures. Use whenever touching packages/core/src/reconciliation, packages/integrations/payment-sources, payment imports, claims, the unmatched queue, pay instructions, or payment tests. Kodibox never integrates with payment rails (no Daraja/STK/C2B, no bank APIs, no payment webhooks).
---
# Payment reconciliation

Kodibox does **not** collect, initiate or detect payments. Tenants pay the landlord directly (paybill/till/bank) using the landlord's **payment instructions** with their **unit code as the account reference**. Kodibox reconciles the evidence that comes in. Read `docs/adr/0007-payment-agnostic-reconciliation.md` first.

## Never
- Add Daraja (STK Push, C2B, Transaction Status), bank APIs/callbacks, payment webhooks, or store payment-rail credentials. That needs a new ADR (see ADR 0007, "Extension point").
- Put raw phone numbers on records or in logs. Use the injected `PhoneHasher` (keyed HMAC from the server, never a plain hash) and `maskPhone` for display.
- Persist `rawLine` or uploaded files unencrypted. They contain payer names/phones; store with envelope encryption and the retention in `docs/SECURITY.md`.
- Let a tenant claim self-verify. A claim becomes verified only when a statement line with the same `externalRef` merges into it, or a manager approves it (maker-checker, audited).
- Use floats for money. Amounts are `bigint` minor units (see `ledger-money`).

## Pipeline (pure engine: `@kodibox/core` → `packages/core/src/reconciliation`)
1. **Parse** untrusted input, which returns `Result<{lines, rowErrors, skipped}, AppError>` and never throws:
   - `parseMpesaStatementCsv(text, {hashPhone})`: M-Pesa business portal export (see `reference.md` for columns). Only `Completed` rows with `Paid In > 0`.
   - `parseBankCsv(text, mapping, {hashPhone})`: generic column mapping `{date, amount | credit/debit, reference, description?, accountRef?, dateFormat}`. Save mappings per org + source account.
   - `parseMpesaSms(text)`: pasted confirmation SMS for tenant claims.
2. **Normalise**: `toPaymentRecord(line, {id, source: 'import'|'claim'|'manual', sourceAccountId})`. Claims start `unverified`, imports/manual start `verified`.
3. **Dedupe**: `dedupe(existing, incoming)`, keyed on (sourceAccountId, normalised externalRef), with a fingerprint fallback (amount + minute + accountRef). Re-importing a statement is a no-op. A claim and its statement line merge (statement fields win, claim id kept, status verified).
4. **Match**: `match(record, candidates, {autoThreshold = 0.9})`. Signals: account ref = unit code (0.92), known payer phone hash (0.6), amount = open balance in window (0.3), amount = monthly rent near an invoice (0.2), combined `1 - Π(1 - w)`. Ambiguity (two leases within 0.1) means no auto match.
5. **Allocate**: `allocate(amount, openInvoices)`, oldest due date first, then remainder to tenant credit. Totals always equal the amount exactly.
6. **Orchestrate**: `reconcile(batch, {existing, candidates, options})` → `{matched, unmatched (reason), duplicates, claimsVerified, allocations}`. Open balances are consumed across the batch, so no double allocation.
7. **Post**: the caller (worker / server action) writes `payment_records`, posts allocations through `packages/core/ledger` (append-only), writes `audit_events`, all inside `withOrg`.

## Unmatched queue actions
Confirm suggestion · Assign to tenant · Split across tenants/invoices · Mark as not rent (ignored, reason required). Each is a server action with `can()` + Zod + audit, and reversals use ledger reversing entries.

## Pay instructions (the thing that makes auto-match work)
Per property/landlord: paybill + "account = unit code", till, bank details. Show them on invoices, reminders, receipts and the tenant app with copy buttons. Reminders say exactly: "Pay Bill <no>, Account <UNIT>".

## Slow recognition mitigations
Tenant claims show "Pending verification" immediately. Import reminders go to landlords (daily/weekly). Penalties/arrears reminders skip tenants with a pending claim inside the grace window.

## Tests
Fixtures live in `packages/core/src/reconciliation/__fixtures__` (fake names, `+254700…` phones). Add a fixture for every new statement layout or SMS variant, and a regression test for every parsing bug. Money invariants: allocations + credit = amount, never negative, no invoice over-allocated.
