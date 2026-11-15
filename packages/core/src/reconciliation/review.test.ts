import { afterEach, describe, expect, it, vi } from 'vitest';
import * as core from '../index';
import { createTestPhoneHasher as fromSubpath } from '../testing';
import { dedupe } from './dedupe';
import { maskPhone } from './normalize';
import { parseBankCsv, parseMpesaSms, parseMpesaStatementCsv } from './parsers';
import { reconcile } from './reconcile';
import { toPaymentRecord } from './records';
import { createTestPhoneHasher } from './testing';
import type { MatchCandidate, OpenInvoice, PaymentRecord } from './types';

const hashPhone = createTestPhoneHasher();
const NOW = new Date('2026-03-15T00:00:00Z');
const opts = { hashPhone, now: NOW };

const rec = (over: Partial<PaymentRecord> & { id: string }): PaymentRecord => ({
  source: 'import',
  sourceKind: 'mpesa',
  sourceAccountId: 'acc1',
  externalRef: 'QFT4AB12CD',
  amount: 1_200_000n,
  currency: 'KES',
  paidAt: '2026-03-11T06:14:00.000Z',
  status: 'verified',
  ...over,
});

const inv = (invoiceId: string, balance: bigint, leaseId: string): OpenInvoice => ({
  tenantId: `T-${leaseId}`,
  leaseId,
  unitCode: leaseId === 'L1' ? 'B-12' : 'C-03',
  invoiceId,
  balance,
  dueDate: '2026-03-05',
});

const cand = (leaseId: string, unitCode: string, sources = ['acc1']): MatchCandidate => ({
  tenantId: `T-${leaseId}`,
  leaseId,
  unitCode,
  monthlyRent: 1_200_000n,
  paymentSourceIds: sources,
  knownPayerPhoneHashes: [],
  openInvoices: [inv(`i-${leaseId}`, 1_200_000n, leaseId)],
});

const json = (v: unknown): string =>
  JSON.stringify(v, (_, x: unknown) => (typeof x === 'bigint' ? x.toString() : x));

describe('N1: the statement line beats a conflicting unverified claim', () => {
  const claim = rec({
    id: 'claim',
    source: 'claim',
    status: 'unverified',
    amount: 1n,
    claimLeaseId: 'L1',
    accountRef: 'B-12',
  });
  const line = rec({ id: 'line', accountRef: 'B-12' });
  const state = { existing: [claim], candidates: [cand('L1', 'B-12')] };

  it('processes the line normally and flags the claim for rejection', () => {
    const r = reconcile([line], state);
    expect(r.matched.map((m) => m.record.id)).toEqual(['line']);
    expect(r.allocations).toHaveLength(1);
    expect(r.conflicts).toHaveLength(1);
    expect(r.conflicts[0]).toMatchObject({
      kind: 'claim_conflict',
      claimToReject: 'claim',
      fields: ['amount'],
    });
    expect(r.alerts).toHaveLength(0);
  });

  it('a re-import does not reprocess it, whatever order the store returns records in', () => {
    for (const existing of [
      [claim, line],
      [line, claim],
    ]) {
      const r = reconcile([{ ...line, id: 'line-again' }], { ...state, existing });
      expect(r.matched).toHaveLength(0);
      expect(r.conflicts).toHaveLength(0);
      expect(r.duplicates).toHaveLength(1);
    }
  });

  it('conflicts against verified records stay quarantined with an alert attributed to the claimant', () => {
    const bad = rec({
      id: 'c2',
      source: 'claim',
      status: 'unverified',
      amount: 5n,
      claimLeaseId: 'L9',
    });
    const r = reconcile([bad], { existing: [line], candidates: [cand('L1', 'B-12')] });
    expect(r.matched).toHaveLength(0);
    expect(r.unmatched).toHaveLength(0);
    expect(r.conflicts[0]?.kind).toBe('conflict_with_verified');
    expect(r.alerts[0]).toMatchObject({ claimId: 'c2', claimantLeaseId: 'L9' });
  });

  it('two disagreeing unverified records are quarantined without processing', () => {
    const other = rec({ id: 'c3', source: 'claim', status: 'unverified', amount: 7n });
    const r = dedupe([claim], [other]);
    expect(r.conflicts[0]?.kind).toBe('unverified_conflict');
    expect(r.fresh).toHaveLength(0);
  });
});

describe('N2: claims are verified only against the claimed lease and source', () => {
  const claim = (over: Partial<PaymentRecord> = {}): PaymentRecord =>
    rec({
      id: 'claim',
      source: 'claim',
      status: 'unverified',
      claimLeaseId: 'L1',
      accountRef: 'B-12',
      ...over,
    });
  const line = rec({ id: 'line', accountRef: 'B-12' });
  const run = (c: PaymentRecord, candidates: MatchCandidate[], l = line) =>
    reconcile([l], { existing: [c], candidates });

  it('verifies when lease and source line up', () => {
    const r = run(claim(), [cand('L1', 'B-12')]);
    expect(r.claimsVerified).toHaveLength(1);
    expect(r.claimsNeedReview).toHaveLength(0);
  });

  it.each([
    ['no_claim_lease', claim({ claimLeaseId: undefined }), [cand('L1', 'B-12')], line],
    [
      'lease_mismatch',
      claim({ claimLeaseId: 'L2' }),
      [cand('L1', 'B-12'), cand('L2', 'C-03')],
      line,
    ],
    [
      'statement_unmatched',
      claim(),
      [cand('L1', 'B-12')],
      rec({ id: 'line', accountRef: undefined, payerName: 'X' }),
    ],
  ] as const)('needs review: %s', (reason, c, candidates, l) => {
    const r = run(c, [...candidates], l);
    expect(r.claimsVerified).toHaveLength(0);
    expect(r.claimsNeedReview.map((x) => x.reason)).toEqual([reason]);
  });
});

describe('N3: phones in free text', () => {
  const mapping = {
    date: 'Date',
    credit: 'Credit',
    reference: 'Ref',
    description: 'Narrative',
    dateFormat: 'DD/MM/YYYY',
  } as const;
  const bank = (narrative: string, ref = 'FT26070ABC12') =>
    parseBankCsv(
      ['Date,Narrative,Ref,Credit', `11/03/2026,"${narrative}",${ref},"1,000.00"`].join('\n'),
      mapping,
      opts,
    );

  it.each([
    'MPESA/0712345678/JOHN',
    'TEL:0712345678',
    '0712345678, JOHN',
    'JOHN +254712345678',
    'JOHN 254712345678.',
    '712345678 JOHN',
  ])('hashes and masks "%s"', (narrative) => {
    const r = bank(narrative);
    const line = r.ok ? r.value.lines[0] : undefined;
    expect(line?.payerPhoneHash).toBe(hashPhone('+254712345678'));
    const { rawLine: _r, ...safe } = line!;
    void _r;
    expect(json(safe)).not.toContain('712345678');
    expect(line?.payerName).toContain('+2547****5678');
  });

  it('masks every hit and ignores non-phone digit runs', () => {
    const r = bank('A 0712345678 B 0722345678 REF 1234567890123 FT26070');
    const name = r.ok ? r.value.lines[0]?.payerName : '';
    expect(name).toBe('A +2547****5678 B +2547****5678 REF 1234567890123 FT26070');
  });

  it('a phone-shaped bank reference becomes no-ref plus a hashed phone', () => {
    const r = bank('RENT', '0712345678');
    const line = r.ok ? r.value.lines[0] : undefined;
    expect(line?.externalRef).toBeUndefined();
    expect(line?.payerPhoneHash).toBe(hashPhone('+254712345678'));
  });

  it('statement payer names are scrubbed too', () => {
    const csv =
      'Receipt No.,Completion Time,Transaction Status,Paid In,Other Party Info\nQFT4AB12CD,2026-03-11 09:00:00,Completed,10.00,254700000001 - JOHN 0712345678';
    const r = parseMpesaStatementCsv(csv, opts);
    expect(r.ok && r.value.lines[0]?.payerName).toBe('JOHN +2547****5678');
  });

  it('masks to the last four digits', () => {
    expect(maskPhone('+254712345678')).toBe('+2547****5678');
  });
});

describe('N5: test hasher is not in the production barrel', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('is only reachable from the testing subpath', () => {
    expect('createTestPhoneHasher' in core).toBe(false);
    expect(fromSubpath()('+254700000001')).toMatch(/^test1:/);
  });

  it('throws in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    expect(() => createTestPhoneHasher()).toThrow();
  });
});

describe('LOW fixes', () => {
  const mapping = { date: 'D', credit: 'C', reference: 'R' } as const;
  const csv = (d: string) => `D,C,R\n${d},100.00,ABCD1234`;

  it('a: only allowlisted bank date formats are accepted', () => {
    // @ts-expect-error free-form formats are not allowed
    const bad = parseBankCsv(csv('11/03/26'), { ...mapping, dateFormat: '(a+)+$' }, opts);
    expect(!bad.ok && bad.error.code).toBe('invalid_mapping');
    const cases: [string, string, string][] = [
      ['DD.MM.YYYY', '11.03.2026', '2026-03-11T09:00:00.000Z'],
      ['MM/DD/YYYY', '03/11/2026', '2026-03-11T09:00:00.000Z'],
      ['YYYY-MM-DD', '2026-03-11', '2026-03-11T09:00:00.000Z'],
      ['DD-MM-YYYY', '11-03-2026', '2026-03-11T09:00:00.000Z'],
    ];
    for (const [fmt, d, iso] of cases) {
      const r = parseBankCsv(csv(d), { ...mapping, dateFormat: fmt as never }, opts);
      expect(r.ok && r.value.lines[0]?.paidAt).toBe(iso);
    }
  });

  it('b: now is required', () => {
    // @ts-expect-error now is required
    parseMpesaStatementCsv('x', { hashPhone });
    // @ts-expect-error options are required for SMS
    parseMpesaSms('x');
    expect(true).toBe(true);
  });

  it('c: sourceKind (not ref shape) scopes dedupe and tolerance', () => {
    const bank = (id: string, acc: string) =>
      rec({ id, sourceKind: 'bank', sourceAccountId: acc, externalRef: 'ABCDEFGH12' });
    expect(dedupe([bank('a', 'A')], [bank('b', 'B')]).fresh).toHaveLength(1);
    const late = { ...bank('c', 'A'), paidAt: '2026-03-11T16:14:00.000Z' };
    expect(dedupe([bank('a', 'A')], [late]).duplicates).toHaveLength(1);
    const lineKind = parseMpesaSms(
      'QFT4AB12CD Confirmed. Ksh10.00 sent to X for account B-12 on 11/3/26 at 9:14 AM.',
      { now: NOW },
    );
    expect(lineKind.ok && lineKind.value.lines[0]?.sourceKind).toBe('mpesa');
    const l = lineKind.ok ? lineKind.value.lines[0]! : undefined;
    expect(
      toPaymentRecord(l!, { id: 'x', source: 'manual', sourceAccountId: 'a', sourceKind: 'cash' })
        .sourceKind,
    ).toBe('cash');
  });

  it('d: only verified records are allocated, whatever the source', () => {
    const manual = rec({
      id: 'm',
      source: 'manual',
      sourceKind: 'cash',
      status: 'unverified',
      accountRef: 'B-12',
      externalRef: undefined,
    });
    const r = reconcile([manual], { existing: [], candidates: [cand('L1', 'B-12')] });
    expect(r.allocations).toHaveLength(0);
    expect(r.unmatched[0]?.reason).toBe('unverified');
    const l = parseMpesaSms(
      'QFT4AB12CD Confirmed. Ksh10.00 sent to X for account B-12 on 11/3/26 at 9:14 AM.',
      { now: NOW },
    );
    const made = toPaymentRecord(l.ok ? l.value.lines[0]! : (undefined as never), {
      id: 'm2',
      source: 'manual',
      sourceAccountId: 'a',
    });
    expect(made.status).toBe('unverified');
    expect(
      toPaymentRecord(l.ok ? l.value.lines[0]! : (undefined as never), {
        id: 'm3',
        source: 'manual',
        sourceAccountId: 'a',
        status: 'verified',
      }).status,
    ).toBe('verified');
  });
});
