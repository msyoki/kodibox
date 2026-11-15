import { describe, expect, it } from 'vitest';
import { allocate } from './allocate';
import { dedupe } from './dedupe';
import { match } from './match';
import { reconcile } from './reconcile';
import type { MatchCandidate, OpenInvoice, PaymentRecord } from './types';

const rec = (over: Partial<PaymentRecord> & { id: string }): PaymentRecord => ({
  source: 'import',
  sourceKind: 'mpesa',
  sourceAccountId: 'acc1',
  externalRef: over.id.toUpperCase(),
  amount: 1_200_000n,
  currency: 'KES',
  paidAt: '2026-03-11T06:14:00.000Z',
  status: 'verified',
  ...over,
});

const inv = (invoiceId: string, balance: bigint, dueDate: string, leaseId = 'L1'): OpenInvoice => ({
  tenantId: `T-${leaseId}`,
  leaseId,
  unitCode: `U-${leaseId}`,
  invoiceId,
  balance,
  dueDate,
});

const cand = (
  leaseId: string,
  unitCode: string,
  invoices: OpenInvoice[],
  phones: string[] = [],
): MatchCandidate => ({
  tenantId: `T-${leaseId}`,
  leaseId,
  unitCode,
  monthlyRent: 1_200_000n,
  paymentSourceIds: ['acc1'],
  knownPayerPhoneHashes: phones,
  openInvoices: invoices,
});

describe('dedupe', () => {
  it('re-import is a no-op', () => {
    const batch = [rec({ id: 'a1' }), rec({ id: 'a2' })];
    const first = dedupe([], batch);
    expect(first.fresh).toHaveLength(2);
    const again = dedupe(
      batch,
      batch.map((r) => ({ ...r, id: `${r.id}-new` })),
    );
    expect(again.fresh).toHaveLength(0);
    expect(again.duplicates).toHaveLength(2);
  });

  it('dedupes within a batch and scopes by source account', () => {
    const r = dedupe(
      [],
      [
        rec({ id: 'x1', externalRef: 'ABC', sourceKind: 'bank' }),
        rec({ id: 'x2', externalRef: 'ABC', sourceKind: 'bank' }),
      ],
    );
    expect(r.fresh.map((x) => x.id)).toEqual(['x1']);
    expect(r.duplicates).toHaveLength(1);
    const other = dedupe(
      [rec({ id: 'x1', externalRef: 'ABC', sourceKind: 'bank' })],
      [rec({ id: 'x3', externalRef: 'ABC', sourceKind: 'bank', sourceAccountId: 'acc2' })],
    );
    expect(other.fresh).toHaveLength(1);
  });

  it('uses amount + minute + accountRef fingerprint when there is no ref', () => {
    const base = { externalRef: undefined, accountRef: 'B-12' };
    const a = rec({ id: 'n1', ...base });
    const same = rec({ id: 'n2', ...base, paidAt: '2026-03-11T06:14:59.000Z' });
    const diffMinute = rec({ id: 'n3', ...base, paidAt: '2026-03-11T06:15:00.000Z' });
    const diffAcc = rec({ id: 'n4', ...base, accountRef: 'B-13' });
    const r = dedupe([a], [same, diffMinute, diffAcc]);
    expect(r.duplicates.map((d) => d.record.id)).toEqual(['n2']);
    expect(r.fresh.map((x) => x.id)).toEqual(['n3', 'n4']);
  });

  it('merges a claim with the statement line: statement wins, claim verified', () => {
    const claim = rec({
      id: 'claim1',
      externalRef: 'QFT4AB12CD',
      source: 'claim',
      status: 'unverified',
      amount: 1_200_000n,
      accountRef: 'B-12',
    });
    const line = rec({ id: 'line1', externalRef: 'QFT4AB12CD', payerName: 'JOHN DOE' });
    const r = dedupe([claim], [line]);
    expect(r.fresh).toHaveLength(0);
    expect(r.duplicates).toHaveLength(0);
    expect(r.merges).toHaveLength(1);
    expect(r.merges[0]?.merged).toMatchObject({
      id: 'claim1',
      source: 'import',
      status: 'verified',
      payerName: 'JOHN DOE',
    });
  });

  it('a claim for an already-imported payment is a duplicate, and claim-vs-claim too', () => {
    const line = rec({ id: 'l1', externalRef: 'Z' });
    const claim = rec({ id: 'c1', externalRef: 'Z', source: 'claim', status: 'unverified' });
    expect(dedupe([line], [claim]).duplicates).toHaveLength(1);
    expect(dedupe([claim], [{ ...claim, id: 'c2' }]).duplicates).toHaveLength(1);
  });
});

describe('match', () => {
  const unit12 = cand('L12', 'B-12', [inv('i12', 1_200_000n, '2026-03-05', 'L12')]);
  const unit14 = cand('L14', 'B-14', [inv('i14', 1_550_000n, '2026-03-05', 'L14')]);

  it.each(['B-12', 'b12', 'B 12', 'b-12'])('matches account ref %s strongly', (accountRef) => {
    const r = match(rec({ id: 'm1', accountRef }), [unit12, unit14]);
    expect(r.target?.leaseId).toBe('L12');
    expect(r.auto).toBe(true);
    expect(r.confidence).toBeGreaterThanOrEqual(0.9);
    expect(r.reasons).toContain('account_ref_matches_unit_code');
  });

  it('known payer phone alone is medium confidence and not auto', () => {
    const c = cand('L12', 'B-12', [], ['h1']);
    const r = match(rec({ id: 'm2', payerPhoneHash: 'h1' }), [c, unit14]);
    expect(r.target?.leaseId).toBe('L12');
    expect(r.confidence).toBeGreaterThan(0.5);
    expect(r.auto).toBe(false);
  });

  it('amount equal to open balance within window is weak', () => {
    const r = match(rec({ id: 'm3' }), [unit12]);
    expect(r.reasons).toEqual(['amount_equals_open_balance']);
    expect(r.confidence).toBeLessThan(0.5);
    expect(r.auto).toBe(false);
  });

  it('amount outside the date window gives no signal', () => {
    const r = match(rec({ id: 'm4', paidAt: '2026-06-11T06:00:00.000Z' }), [unit12]);
    expect(r.target).toBeNull();
    expect(r.reasons).toEqual(['no_signal']);
  });

  it('monthly rent counts when an invoice is near, even if balance differs', () => {
    const c = cand('L1', 'A-1', [inv('i1', 2_400_000n, '2026-03-05')]);
    expect(match(rec({ id: 'm5' }), [c]).reasons).toEqual(['amount_equals_monthly_rent']);
  });

  it('ties and ambiguity produce no target', () => {
    const dupA = cand('LA', 'B-12', []);
    const dupB = cand('LB', 'B-12', []);
    const r = match(rec({ id: 'm6', accountRef: 'B-12' }), [dupA, dupB]);
    expect(r.target).toBeNull();
    expect(r.ambiguous).toBe(true);
    expect(r.auto).toBe(false);
    expect(r.alternatives).toHaveLength(2);
  });

  it('honours a custom threshold', () => {
    const r = match(rec({ id: 'm7', accountRef: 'B-12' }), [unit12], { autoThreshold: 0.99 });
    expect(r.target?.leaseId).toBe('L12');
    expect(r.auto).toBe(false);
  });

  it('no candidates', () => {
    expect(match(rec({ id: 'm8' }), []).target).toBeNull();
  });
});

describe('allocate', () => {
  const invoices = [
    { invoiceId: 'b', balance: 500n, dueDate: '2026-02-01' },
    { invoiceId: 'a', balance: 300n, dueDate: '2026-01-01' },
    { invoiceId: 'c', balance: 700n, dueDate: '2026-03-01' },
    { invoiceId: 'z', balance: 0n, dueDate: '2025-12-01' },
  ];

  const sum = (xs: readonly { amount: bigint }[]): bigint => xs.reduce((s, x) => s + x.amount, 0n);

  it('allocates oldest first, then credit', () => {
    const r = allocate(1_000n, invoices);
    expect(r.ok && r.value.allocations).toEqual([
      { invoiceId: 'a', amount: 300n },
      { invoiceId: 'b', amount: 500n },
      { invoiceId: 'c', amount: 200n },
    ]);
    const over = allocate(2_000n, invoices);
    expect(over.ok && over.value.credit).toBe(500n);
  });

  it('breaks due-date ties by invoice id and does not mutate input', () => {
    const tie = [
      { invoiceId: 'y', balance: 10n, dueDate: '2026-01-01' },
      { invoiceId: 'x', balance: 10n, dueDate: '2026-01-01' },
    ];
    const r = allocate(10n, tie);
    expect(r.ok && r.value.allocations).toEqual([{ invoiceId: 'x', amount: 10n }]);
    expect(tie[0]?.invoiceId).toBe('y');
  });

  it('whole amount is credit when nothing is open', () => {
    const r = allocate(99n, []);
    expect(r.ok && r.value).toEqual({ allocations: [], credit: 99n });
  });

  it('rejects zero and negative amounts', () => {
    for (const a of [0n, -1n]) {
      const r = allocate(a, invoices);
      expect(!r.ok && r.error.code).toBe('invalid_amount');
    }
  });

  it('property: allocations + credit sum exactly, never negative, never over balance', () => {
    // Deterministic LCG, no float money. (fast-check is not a dependency.)
    let seed = 12345n;
    const next = (max: bigint): bigint => {
      seed = (seed * 6364136223846793005n + 1442695040888963407n) % 2n ** 64n;
      return (seed >> 16n) % max;
    };
    for (let t = 0; t < 500; t++) {
      const n = Number(next(8n));
      const list = Array.from({ length: n }, (_, i) => ({
        invoiceId: `i${i}`,
        balance: next(2_000_000n) - 100_000n, // includes zero/negative balances
        dueDate: `2026-0${1 + Number(next(9n))}-01`,
      }));
      const amount = next(5_000_000n) + 1n;
      const r = allocate(amount, list);
      expect(r.ok).toBe(true);
      if (!r.ok) continue;
      expect(sum(r.value.allocations) + r.value.credit).toBe(amount);
      expect(r.value.credit).toBeGreaterThanOrEqual(0n);
      for (const a of r.value.allocations) {
        const src = list.find((l) => l.invoiceId === a.invoiceId)!;
        expect(a.amount).toBeGreaterThan(0n);
        expect(a.amount).toBeLessThanOrEqual(src.balance);
      }
      if (r.value.credit > 0n) {
        expect(sum(r.value.allocations)).toBe(
          list.filter((l) => l.balance > 0n).reduce((s, l) => s + l.balance, 0n),
        );
      }
    }
  });
});

describe('reconcile', () => {
  const candidates = [
    cand('L12', 'B-12', [
      inv('i12a', 1_200_000n, '2026-02-05', 'L12'),
      inv('i12b', 1_200_000n, '2026-03-05', 'L12'),
    ]),
    cand('L14', 'B-14', [inv('i14', 1_550_000n, '2026-03-05', 'L14')]),
  ];

  const batch = [
    rec({ id: 'p1', accountRef: 'B-12', amount: 1_500_000n }),
    rec({ id: 'p2', accountRef: 'b14', amount: 1_550_000n, paidAt: '2026-03-11T07:00:00.000Z' }),
    rec({ id: 'p3', accountRef: undefined, amount: 777n }),
    rec({ id: 'p1dup', externalRef: 'P1', accountRef: 'B-12', amount: 1_500_000n }),
    rec({ id: 'p4', amount: 0n, accountRef: 'B-12' }),
    rec({ id: 'p5', currency: 'USD' as never, accountRef: 'B-12' }),
  ];

  const state = { existing: [] as PaymentRecord[], candidates };

  it('classifies matched, unmatched and duplicates', () => {
    const r = reconcile(batch, state);
    expect(r.matched.map((m) => m.record.id)).toEqual(['p1', 'p2']);
    expect(r.duplicates.map((d) => d.record.id)).toEqual(['p1dup']);
    expect(Object.fromEntries(r.unmatched.map((u) => [u.record.id, u.reason]))).toEqual({
      p3: 'no_signal',
      p4: 'invalid_amount',
      p5: 'invalid_currency',
    });
  });

  it('allocates oldest-first with leftover credit', () => {
    const r = reconcile(batch, state);
    expect(r.matched[0]?.allocations).toEqual([
      { invoiceId: 'i12a', amount: 1_200_000n },
      { invoiceId: 'i12b', amount: 300_000n },
    ]);
    expect(r.matched[1]?.credit).toBe(0n);
    expect(r.allocations).toHaveLength(3);
    const total = r.allocations.reduce((s, a) => s + a.amount, 0n);
    expect(total).toBe(3_050_000n);
  });

  it('consumes balances across the batch so debts are not paid twice', () => {
    const two = [
      rec({ id: 'q1', accountRef: 'B-14', amount: 1_000_000n }),
      rec({ id: 'q2', accountRef: 'B-14', amount: 1_000_000n, paidAt: '2026-03-11T08:00:00.000Z' }),
    ];
    const r = reconcile(two, state);
    expect(r.matched[0]?.allocations).toEqual([{ invoiceId: 'i14', amount: 1_000_000n }]);
    expect(r.matched[1]?.allocations).toEqual([{ invoiceId: 'i14', amount: 550_000n }]);
    expect(r.matched[1]?.credit).toBe(450_000n);
  });

  it('is deterministic and does not mutate its inputs', () => {
    const before = JSON.stringify(candidates, (_, v: unknown) =>
      typeof v === 'bigint' ? v.toString() : v,
    );
    const a = reconcile(batch, state);
    const b = reconcile(batch, state);
    expect(b).toEqual(a);
    expect(
      JSON.stringify(candidates, (_, v: unknown) => (typeof v === 'bigint' ? v.toString() : v)),
    ).toBe(before);
  });

  it('re-importing the same batch produces nothing new', () => {
    const first = reconcile(batch, state);
    const stored = [...first.matched.map((m) => m.record), ...first.unmatched.map((u) => u.record)];
    const again = reconcile(
      batch.map((r) => ({ ...r, id: `${r.id}-2` })),
      { ...state, existing: stored },
    );
    expect(again.matched).toHaveLength(0);
    expect(again.duplicates.length).toBeGreaterThanOrEqual(2);
  });

  it('verifies a claim from a statement line and still matches the payment', () => {
    const claim = rec({
      id: 'c1',
      externalRef: 'QFT1',
      source: 'claim',
      status: 'unverified',
      claimLeaseId: 'L14',
      accountRef: 'B-14',
      amount: 1_550_000n,
    });
    const line = rec({ id: 'l1', externalRef: 'QFT1', accountRef: 'B-14', amount: 1_550_000n });
    const r = reconcile([line], { ...state, existing: [claim] });
    expect(r.claimsVerified).toHaveLength(1);
    expect(r.matched[0]?.record.id).toBe('c1');
    expect(r.matched[0]?.record.status).toBe('verified');
  });

  it('leaves ambiguous and below-threshold payments for the unmatched queue', () => {
    const amb = [cand('LA', 'B-12', []), cand('LB', 'B-12', [])];
    const r = reconcile(
      [rec({ id: 'a1', accountRef: 'B-12' }), rec({ id: 'a2', payerPhoneHash: 'h' })],
      {
        existing: [],
        candidates: [...amb, cand('LC', 'C-1', [], ['h'])],
      },
    );
    const reasons = Object.fromEntries(r.unmatched.map((u) => [u.record.id, u.reason]));
    expect(reasons).toEqual({ a1: 'ambiguous', a2: 'below_threshold' });
    expect(r.unmatched[1]?.match?.target?.leaseId).toBe('LC');
  });

  it('empty batch', () => {
    expect(reconcile([], state)).toEqual({
      matched: [],
      unmatched: [],
      duplicates: [],
      claimsVerified: [],
      claimsNeedReview: [],
      conflicts: [],
      alerts: [],
      possibleDuplicates: [],
      allocations: [],
    });
  });
});
