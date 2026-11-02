---
name: ledger-money
description: Money and double-entry ledger rules for Kodibox - integer minor units, Money helper, posting API, chart of accounts, payment allocation, reversals, rounding, property-based tests. Use whenever touching packages/core/ledger, invoices, charges, payments, penalties, deposits, statements, or any amount.
---
# Ledger and money

Never use floats. Amounts are `bigint` minor units (KES cents) plus currency. Ledger entries are append-only: fix mistakes with reversing entries. All balance changes go through `packages/core/ledger` (pure, no I/O); persistence happens in the caller inside one DB transaction with `withOrg`.

More detail (accounts table, allocation code, tests): [reference.md](reference.md).

## Money helper
```ts
export type Currency = 'KES';
export class Money {
  private constructor(readonly minor: bigint, readonly currency: Currency = 'KES') {}
  static of(minor: bigint | number, c: Currency = 'KES') {
    if (typeof minor === 'number' && !Number.isSafeInteger(minor)) throw new Error('non-integer money');
    return new Money(BigInt(minor), c);
  }
  static fromKesString(s: string) {            // "15000.50" -> 1500050n; rejects >2 decimals
    const m = /^(-?\d+)(?:\.(\d{1,2}))?$/.exec(s.trim());
    if (!m) throw new Error('invalid amount');
    const frac = (m[2] ?? '').padEnd(2, '0');
    return new Money(BigInt(m[1]) * 100n + (m[1].startsWith('-') ? -BigInt(frac) : BigInt(frac)));
  }
  add(o: Money) { this.same(o); return new Money(this.minor + o.minor, this.currency); }
  sub(o: Money) { this.same(o); return new Money(this.minor - o.minor, this.currency); }
  neg() { return new Money(-this.minor, this.currency); }
  isZero() { return this.minor === 0n; }
  /** Basis-point percentage with round-half-up on magnitude (document the rule per use). */
  pctBp(bp: number) { const n = this.minor * BigInt(bp); const q = (n + (n >= 0n ? 5000n : -5000n)) / 10000n; return new Money(q, this.currency); }
  format() { /* Intl.NumberFormat en-KE, only at the UI edge */ }
  private same(o: Money) { if (o.currency !== this.currency) throw new Error('currency mismatch'); }
}
```
Serialise as strings in JSON (`"150000"`), never as JS numbers.

## Posting API
```ts
type Line = { accountId: AccountId; side: 'debit' | 'credit'; amount: Money; leaseId?: LeaseId; unitId?: UnitId };
type Posting = { id: PostingId; orgId: OrgId; idempotencyKey: string; occurredOn: string /* date */;
                 memo: string; lines: Line[]; reverses?: PostingId; source: { type: string; id: string } };

export function validatePosting(p: Posting): Result<Posting, AppError> {
  // >= 2 lines, every amount > 0, single currency, sum(debits) === sum(credits)
}
// Persistence: INSERT posting + lines in one tx; UNIQUE (organization_id, idempotency_key);
// ledger tables have no UPDATE/DELETE grants; balances are derived (or cached via trigger/projection).
```
Examples: Invoice rent: Dr Tenant Receivable / Cr Rent Income. Payment received: Dr Cash/M-Pesa Clearing / Cr Tenant Receivable. Overpayment: remainder Cr Tenant Credit. Deposit received: Dr Clearing / Cr Deposits Held.

## Allocation (summary)
Sort open charges oldest due-date first, with a configurable class priority (default: rent, water, other, penalties last). Allocate `min(remaining, outstanding)` per charge; leftover goes to Tenant Credit. Pure function, deterministic, returns allocations + leftover; the caller posts them. Never allocate more than the payment; never allocate to a closed or reversed charge.

## Reversals and rounding
- Reverse by posting an equal-and-opposite posting that references `reverses`; a posting can be reversed once; re-issue a corrected posting afterwards. Require reason + audit event.
- Pro-rata rent: `rent * daysOccupied / daysInMonth` using bigint, round half up on the final line only; put any 1-cent residue on the last charge so totals reconcile.
- Percentages (commission, penalties) via basis points; document rounding in the function name or doc.
- Agency payouts: commission is computed at posting time and recorded as Cr Commission Income / Dr Landlord Payable; Kodibox never moves the landlord money.

## Tests (property-based, fast-check)
Every posting balances; sum of all account balances is zero; allocations total <= payment and never exceed outstanding; reversal restores prior balances; replaying an idempotency key changes nothing; pro-rata splits sum exactly to the whole. See reference.md.
