import { describe, expect, it } from 'vitest';
import { dedupe } from './dedupe';
import { normalisePhone, scrubPhones, stripPhones } from './normalize';
import { parseBankCsv, parseMpesaSms, parseMpesaStatementCsv } from './parsers';
import { reconcile } from './reconcile';
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

const inv = (invoiceId: string, leaseId: string): OpenInvoice => ({
  tenantId: `T-${leaseId}`,
  leaseId,
  unitCode: leaseId === 'L1' ? 'B-12' : 'C-03',
  invoiceId,
  balance: 1_200_000n,
  dueDate: '2026-03-05',
});

const cand = (leaseId: string, unitCode: string): MatchCandidate => ({
  tenantId: `T-${leaseId}`,
  leaseId,
  unitCode,
  monthlyRent: 1_200_000n,
  paymentSourceIds: ['acc1'],
  knownPayerPhoneHashes: [],
  openInvoices: [inv(`i-${leaseId}`, leaseId)],
});

const claim = (id: string, leaseId: string): PaymentRecord =>
  rec({ id, source: 'claim', status: 'unverified', claimLeaseId: leaseId, accountRef: 'C-03' });

describe('H1: only a verified import merges a claim', () => {
  const pending = claim('c1', 'L2');
  const state = { existing: [pending], candidates: [cand('L1', 'B-12'), cand('L2', 'C-03')] };

  it('an unverified manual record never merges or allocates', () => {
    const manual = rec({
      id: 'm1',
      source: 'manual',
      sourceKind: 'mpesa',
      status: 'unverified',
      accountRef: 'C-03',
    });
    const r = reconcile([manual], state);
    expect(r.claimsVerified).toHaveLength(0);
    expect(r.claimsNeedReview).toHaveLength(0);
    expect(r.allocations).toHaveLength(0);
    expect(r.matched).toHaveLength(0);
    expect(r.conflicts[0]).toMatchObject({ kind: 'unverified_conflict' });
  });

  it.each(['reversed', 'rejected'] as const)(
    'an incoming %s record never merges or allocates',
    (status) => {
      const r = reconcile([rec({ id: 'x', status, accountRef: 'C-03' })], state);
      expect(r.claimsVerified).toHaveLength(0);
      expect(r.allocations).toHaveLength(0);
      expect(r.conflicts[0]?.kind).toBe('unverified_conflict');
    },
  );

  it('an unverified import line does not merge either', () => {
    const r = dedupe([pending], [rec({ id: 'u', status: 'unverified', accountRef: 'C-03' })]);
    expect(r.merges).toHaveLength(0);
  });

  it('a verified import merges and keeps its own status', () => {
    const r = dedupe([pending], [rec({ id: 'l', accountRef: 'C-03' })]);
    expect(r.merges[0]?.merged).toMatchObject({ id: 'c1', status: 'verified', source: 'import' });
  });
});

describe('M1: phones embedded in account references', () => {
  const mapping = {
    date: 'Date',
    credit: 'Credit',
    reference: 'Ref',
    accountRef: 'Account',
    dateFormat: 'DD/MM/YYYY',
  } as const;
  const bank = (account: string) =>
    parseBankCsv(
      ['Date,Ref,Credit,Account', `11/03/2026,FT26070ABC12,"1,000.00","${account}"`].join('\n'),
      mapping,
      opts,
    );
  const stmt = (account: string) =>
    parseMpesaStatementCsv(
      `Receipt No.,Completion Time,Transaction Status,Paid In,A/C No.\nQFT4AB12CD,2026-03-11 09:00:00,Completed,10.00,"${account}"`,
      opts,
    );
  const strip = (l: object | undefined): string => {
    const { rawLine: _r, ...rest } = l as { rawLine?: string };
    void _r;
    return JSON.stringify(rest, (_, v: unknown) => (typeof v === 'bigint' ? v.toString() : v));
  };
  const H = hashPhone('+254712345678');

  it.each([
    ['B12 0712345678', 'B-12'],
    ['0712345678 B12', 'B-12'],
    ['B12 0712 345 678', 'B-12'],
    ['B12 +254-712-345678', 'B-12'],
    ['RENT 0712345678', undefined],
    ['B 0712345678', undefined],
    ['0712345678', undefined],
  ])('bank and statement account "%s"', (account, expected) => {
    for (const parsed of [bank(account), stmt(account)]) {
      const line = parsed.ok ? parsed.value.lines[0] : undefined;
      expect(line?.accountRef).toBe(expected);
      expect(line?.payerPhoneHash).toBe(H);
      expect(strip(line)).not.toContain('712345678');
    }
  });

  it('SMS account references are stripped of phones', () => {
    const sms = (acct: string) =>
      parseMpesaSms(
        `QFT4AB12CD Confirmed. Ksh10.00 sent to X for account ${acct} on 11/3/26 at 9:14 AM.`,
        { now: NOW },
      );
    const a = sms('B12 0712345678');
    expect(a.ok && a.value.lines[0]?.accountRef).toBe('B-12');
    const b = sms('RENT 0712345678');
    expect(b.ok && b.value.lines[0]?.accountRef).toBeUndefined();
    expect(JSON.stringify(a.ok && a.value.lines[0]?.accountRef)).not.toContain('712');
  });

  it('the Details fallback is stripped too', () => {
    const r = parseMpesaStatementCsv(
      'Receipt No.,Completion Time,Details,Transaction Status,Paid In\nQFT4AB12CD,2026-03-11 09:00:00,Pay Bill Acc. B12 0712345678,Completed,10.00',
      opts,
    );
    const line = r.ok ? r.value.lines[0] : undefined;
    expect(line?.accountRef).toBe('B-12');
    expect(line?.payerPhoneHash).toBe(H);
  });

  it('PHONE_RUN accepts single space/dash separators and stays linear', () => {
    for (const v of [
      '0712 345 678',
      '0712-345-678',
      '+254 712 345 678',
      '+254-712-345678',
      '254712345678',
    ]) {
      expect(stripPhones(`X ${v} Y`).e164).toEqual(['+254712345678']);
      expect(scrubPhones(v, hashPhone).phoneHash).toBe(H);
    }
    expect(stripPhones('1 234 567 890 123').e164).toEqual([]);
    expect(normalisePhone('0712 345 678')).toBe('+254712345678');
    const t = performance.now();
    stripPhones('0 7 1 2 3 '.repeat(50) + '-'.repeat(400) + '254 '.repeat(100));
    expect(performance.now() - t).toBeLessThan(50);
  });
});

describe('LOW: several pending claims per key', () => {
  const c1 = claim('c1', 'L1');
  const c2 = claim('c2', 'L2');
  const candidates = [cand('L1', 'B-12'), cand('L2', 'C-03')];
  const line = rec({ id: 'line', accountRef: 'C-03' });

  it('keeps every pending claim and prefers the one for the matched lease', () => {
    for (const existing of [
      [c1, c2],
      [c2, c1],
    ]) {
      const r = reconcile([line], { existing, candidates });
      expect(r.matched.map((m) => m.record.id)).toEqual(['c2']);
      expect(r.allocations.map((a) => a.recordId)).toEqual(['c2']);
      expect(r.claimsVerified.map((c) => c.claim.id)).toEqual(['c2']);
      expect(r.claimsNeedReview).toHaveLength(1);
      expect(r.claimsNeedReview[0]).toMatchObject({ reason: 'duplicate_claim' });
      expect(r.claimsNeedReview[0]?.merge.claim.id).toBe('c1');
    }
  });

  it('with no lease match the first claim is kept and the rest are reviewed', () => {
    const r = reconcile([rec({ id: 'line', accountRef: undefined })], {
      existing: [c1, c2],
      candidates,
    });
    expect(r.claimsVerified).toHaveLength(0);
    expect(r.claimsNeedReview.map((x) => x.reason).sort()).toEqual([
      'duplicate_claim',
      'statement_unmatched',
    ]);
  });

  it('incoming claims for different leases are both kept, same lease is a duplicate', () => {
    const r = dedupe([c1], [c2, { ...c1, id: 'c1b' }]);
    expect(r.fresh.map((x) => x.id)).toEqual(['c2']);
    expect(r.duplicates.map((x) => x.record.id)).toEqual(['c1b']);
  });

  it('disagreeing claims are flagged for rejection while the agreeing one merges', () => {
    const liar = { ...claim('c3', 'L1'), amount: 5n };
    const r = reconcile([line], { existing: [c2, liar], candidates });
    expect(r.claimsVerified.map((c) => c.claim.id)).toEqual(['c2']);
    expect(r.conflicts).toMatchObject([{ kind: 'claim_conflict', claimToReject: 'c3' }]);
  });
});
