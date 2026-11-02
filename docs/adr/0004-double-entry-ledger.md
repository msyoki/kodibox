# 0004. Append-only double-entry ledger

- Status: Accepted
- Date: 2026-11-02

## Context
Rent management has recurring disputes: "I paid", "this balance is wrong", deposit deductions, reversed M-Pesa payments, agency remittances. Mutable `balance` columns drift and cannot explain themselves. Auditors and the KRA require traceable records. Money bugs are the most damaging class of defect.

## Decision
- All balance changes are **double-entry postings**: `ledger_transactions` with `ledger_entries` that sum to zero per currency, created only via `packages/core/ledger.post()`.
- Amounts are integer minor units (`bigint`); no floats anywhere.
- Entries and transactions are **append-only**: DB privileges are INSERT/SELECT, and triggers reject UPDATE/DELETE. Corrections are **reversing transactions** linked by `reverses_transaction_id`.
- A deferred constraint trigger enforces zero-sum at commit; `post()` validates before insert.
- Postings are idempotent through a unique `(organization_id, idempotency_key)`.
- Denormalised balances (`ledger_balances`, invoice paid/balance) are updated in the same transaction; a nightly `ledger-verify` job recomputes from entries and alerts on drift.
- Deposits are liabilities; unmatched payments sit in a suspense account; overpayments become tenant credits.

## Consequences
- Every balance is explainable and auditable; history is never lost; reports (statements, arrears, KRA, landlord remittance) derive from one source.
- More complex than updating a balance column: developers must learn account semantics, and simple features need two entries.
- Corrections create extra rows rather than edits; UI must present "reversed" items clearly.
- Write contention on hot balance rows is handled by per-lease locking; acceptable at expected volume.
- Storage grows monotonically; partition by month and archive per retention rules (tax records kept 7 years).
- `core/ledger` must stay 100% unit-tested, with property tests for zero-sum and reversal round-trips.
