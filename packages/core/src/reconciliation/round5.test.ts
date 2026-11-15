import { describe, expect, it } from 'vitest';
import { stripPhones } from './normalize';
import { parseBankCsv, parseMpesaSms, parseMpesaStatementCsv } from './parsers';
import { reconcile } from './reconcile';
import { createTestPhoneHasher } from './testing';
import type { MatchCandidate, PaymentRecord } from './types';

const hashPhone = createTestPhoneHasher();
const NOW = new Date('2026-03-15T00:00:00Z');
const opts = { hashPhone, now: NOW };
const H = hashPhone('+254712345678');

describe('phone typed straight after digits', () => {
  it.each([
    ['B120712345678', 'B12'],
    ['B12712345678', 'B12'],
    ['B12254712345678', 'B12'],
    ['B12 0712345678', 'B12'],
  ])('stripPhones("%s")', (input, rest) => {
    const r = stripPhones(input);
    expect(r.text).toBe(rest);
    expect(r.e164).toEqual(['+254712345678']);
  });

  it('leaves long non-phone digit runs alone', () => {
    expect(stripPhones('B12345678901234').e164).toEqual([]);
    expect(stripPhones('B-1207').text).toBe('B-1207');
    const t = performance.now();
    stripPhones('1'.repeat(500));
    expect(performance.now() - t).toBeLessThan(50);
  });

  it('bank, statement and SMS paths hash the phone and keep the unit code', () => {
    const bank = parseBankCsv(
      'Date,Ref,Credit,Account\n11/03/2026,FT26070ABC12,"1,000.00",B120712345678',
      {
        date: 'Date',
        credit: 'Credit',
        reference: 'Ref',
        accountRef: 'Account',
        dateFormat: 'DD/MM/YYYY',
      },
      opts,
    );
    const stmt = parseMpesaStatementCsv(
      'Receipt No.,Completion Time,Transaction Status,Paid In,A/C No.\nQFT4AB12CD,2026-03-11 09:00:00,Completed,10.00,B120712345678',
      opts,
    );
    for (const p of [bank, stmt]) {
      const line = p.ok ? p.value.lines[0] : undefined;
      expect(line?.accountRef).toBe('B-12');
      expect(line?.payerPhoneHash).toBe(H);
    }
    const sms = parseMpesaSms(
      'QFT4AB12CD Confirmed. Ksh10.00 sent to X for account B120712345678 on 11/3/26 at 9:14 AM.',
      { now: NOW },
    );
    expect(sms.ok && sms.value.lines[0]?.accountRef).toBe('B-12');
  });
});

describe('claim-id rewrite reaches every output', () => {
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
  const cand = (leaseId: string, unitCode: string): MatchCandidate => ({
    tenantId: `T-${leaseId}`,
    leaseId,
    unitCode,
    monthlyRent: 1_200_000n,
    paymentSourceIds: ['acc1'],
    knownPayerPhoneHashes: [],
    openInvoices: [
      {
        tenantId: `T-${leaseId}`,
        leaseId,
        unitCode,
        invoiceId: `i-${leaseId}`,
        balance: 1_200_000n,
        dueDate: '2026-03-05',
      },
    ],
  });
  const claim = (id: string, leaseId: string, over: Partial<PaymentRecord> = {}): PaymentRecord =>
    rec({
      id,
      source: 'claim',
      status: 'unverified',
      claimLeaseId: leaseId,
      accountRef: 'C-03',
      sourceAccountId: 'claimSrc',
      ...over,
    });
  const candidates = [cand('L1', 'B-12'), cand('L2', 'C-03')];

  it('duplicates, conflicts and alerts point at the claim that was verified', () => {
    const line = rec({ id: 'line', accountRef: 'C-03' });
    const again = rec({ id: 'again', accountRef: 'C-03' });
    const tampered = rec({ id: 'bad', accountRef: 'C-03', amount: 1n });
    const r = reconcile([line, again, tampered], {
      existing: [claim('c1', 'L1'), claim('c2', 'L2')],
      candidates,
    });
    expect(r.claimsVerified.map((c) => c.claim.id)).toEqual(['c2']);
    expect(r.duplicates.map((d) => [d.record.id, d.of.id])).toEqual([['again', 'c2']]);
    expect(r.conflicts.find((c) => c.kind === 'conflict_with_verified')?.of.id).toBe('c2');
    expect(r.alerts.map((a) => a.of.id)).toEqual(['c2']);
  });

  it('the source check uses the import source account, not the claim source', () => {
    // Claim names a different source account but the statement's source is allowed for the lease.
    const r = reconcile([rec({ id: 'line', accountRef: 'C-03' })], {
      existing: [claim('c2', 'L2')],
      candidates,
    });
    expect(r.claimsVerified.map((c) => c.claim.id)).toEqual(['c2']);
    expect(r.claimsNeedReview).toHaveLength(0);
  });
});
