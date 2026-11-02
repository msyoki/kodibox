# Ledger reference

## Chart of accounts (per organization, seeded on creation)
| Code | Name | Type | Normal side | Notes |
|---|---|---|---|---|
| 1000 | Cash/M-Pesa Clearing | Asset | Debit | Payments seen in landlord's paybill/till/bank; reconciled to statements. Not a Kodibox-held balance |
| 1100 | Tenant Receivable | Asset | Debit | One sub-ledger per lease (leaseId on line) |
| 1200 | Unallocated Receipts (suspense) | Liability | Credit | Payments not yet matched to a unit |
| 2000 | Deposits Held | Liability | Credit | Tenant security deposit owed back; held by landlord, not Kodibox |
| 2100 | Tenant Credit | Liability | Credit | Overpayments / prepaid rent |
| 2200 | Landlord Payable | Liability | Credit | Agencies only: collected rent owed to landlord net of commission |
| 4000 | Rent Income | Income | Credit | |
| 4100 | Water Income | Income | Credit | Utilities may be pass-through; configure per org |
| 4200 | Penalty Income | Income | Credit | Late fees |
| 4300 | Commission Income | Income | Credit | Agency management fee |
| 5000 | Bad Debt / Write-offs | Expense | Debit | Write-offs reference the original charge |
Add accounts via migration seeds, never rename codes.

## Common postings
| Event | Debit | Credit |
|---|---|---|
| Rent invoice | Tenant Receivable | Rent Income |
| Water invoice | Tenant Receivable | Water Income |
| Late penalty | Tenant Receivable | Penalty Income |
| Payment matched | Cash/M-Pesa Clearing | Tenant Receivable |
| Payment unmatched | Cash/M-Pesa Clearing | Unallocated Receipts |
| Match later | Unallocated Receipts | Tenant Receivable |
| Overpayment remainder | Cash/M-Pesa Clearing | Tenant Credit |
| Apply credit to new invoice | Tenant Credit | Tenant Receivable |
| Deposit received | Cash/M-Pesa Clearing | Deposits Held |
| Deposit refund / deduction | Deposits Held | Cash/M-Pesa Clearing (refund) or Tenant Receivable (offset damages) |
| Agency commission | Landlord Payable | Commission Income |
| Waive / write off | Rent Income or Bad Debt | Tenant Receivable |

## Allocation algorithm
```ts
type OpenCharge = { id: string; kind: 'rent' | 'water' | 'other' | 'penalty'; dueOn: string; outstanding: Money };
type AllocConfig = { priority: Array<OpenCharge['kind']> };      // default ['rent','water','other','penalty']
export const DEFAULT_ALLOC: AllocConfig = { priority: ['rent', 'water', 'other', 'penalty'] };

export function allocate(payment: Money, charges: OpenCharge[], cfg = DEFAULT_ALLOC) {
  const rank = (k: OpenCharge['kind']) => cfg.priority.indexOf(k);
  // Oldest due date first, then class priority, then id for determinism.
  // Penalties-last variant: sort by (kind === 'penalty') first, then dueOn.
  const sorted = [...charges].filter(c => c.outstanding.minor > 0n)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn) || rank(a.kind) - rank(b.kind) || a.id.localeCompare(b.id));
  let left = payment;
  const allocations: { chargeId: string; amount: Money }[] = [];
  for (const c of sorted) {
    if (left.minor <= 0n) break;
    const amt = left.minor < c.outstanding.minor ? left : c.outstanding;
    allocations.push({ chargeId: c.id, amount: amt });
    left = left.sub(amt);
  }
  return { allocations, credit: left };   // credit -> Tenant Credit
}
```
Org setting `allocationStrategy`: `oldest_first` (default) or `class_priority_then_oldest`. When penalties are set to "last", all non-penalty charges sort before penalties regardless of age. Store the strategy used on the allocation audit event.

## Property-based tests (fast-check)
```ts
import fc from 'fast-check';
const money = fc.bigInt({ min: 1n, max: 10_000_000n }).map(n => Money.of(n));
it('allocations never exceed payment or outstanding, and conserve value', () => {
  fc.assert(fc.property(money, fc.array(chargeArb, { maxLength: 20 }), (pay, charges) => {
    const { allocations, credit } = allocate(pay, charges);
    const total = allocations.reduce((s, a) => s.add(a.amount), Money.of(0n));
    expect(total.add(credit).minor).toBe(pay.minor);
    for (const a of allocations) expect(a.amount.minor <= charges.find(c => c.id === a.chargeId)!.outstanding.minor).toBe(true);
  }));
});
```
More properties: any generated sequence of postings leaves trial balance at zero; reversing every posting returns every account to zero; `fromKesString(format(x)) === x`; pro-rata of N days across a month sums to rent when the month is split at any day; idempotent replay of a posting list yields identical balances; allocate is monotonic (larger payment never reduces any allocation).

## DB guards
- `CHECK (amount_minor > 0)` on lines; `side IN ('debit','credit')`.
- Deferred constraint trigger: sum(debit) = sum(credit) per posting at commit.
- `REVOKE UPDATE, DELETE ON ledger_postings, ledger_lines FROM app_role;` plus a trigger that raises on UPDATE/DELETE for owners.
