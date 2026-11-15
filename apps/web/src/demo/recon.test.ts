import { SAMPLE_CLAIMS, SAMPLE_MPESA_STATEMENT_CSV } from '@kodibox/demo';
import { describe, expect, it } from 'vitest';
import { maskPayerName } from './billing';
import {
  applyImport,
  approveClaim,
  assignUnmatched,
  getReconStatus,
  ignoreUnmatched,
  parseStatement,
  previewImport,
  previewSms,
  rejectClaim,
  splitUnmatched,
  submitClaim,
  tenantPaidDelta,
} from './recon';
import { seedData } from './seed';
import type { DemoData } from './types';

const fresh = (): DemoData => structuredClone(seedData);

const importSample = (d: DemoData) => {
  const parsed = parseStatement('mpesa', SAMPLE_MPESA_STATEMENT_CSV);
  if (!parsed.ok) throw new Error(parsed.message);
  return previewImport(d, parsed.value, { kind: 'mpesa', fileName: 'sample.csv' });
};

describe('statement import (demo state over the core engine)', () => {
  it('seeds claims from SAMPLE_CLAIMS, all pending', () => {
    const d = fresh();
    expect(d.claims).toHaveLength(SAMPLE_CLAIMS.length);
    expect(d.claims.every((c) => c.status === 'pending')).toBe(true);
    expect(getReconStatus(d).lastImportDaysAgo).toBe(3);
  });

  it('previews counts without changing state, with row errors and a duplicate', () => {
    const d = fresh();
    const p = importSample(d);
    expect(p.counts.duplicates).toBe(1);
    expect(p.counts.rowErrors).toBeGreaterThan(0);
    expect(p.counts.fresh).toBe(p.counts.autoMatched + p.counts.needsReview);
    expect(d.payments).toEqual(seedData.payments);
  });

  it('confirm posts payments, drops balances, verifies the matching claim', () => {
    const d = fresh();
    const p = importSample(d);
    const after = applyImport(d, p);
    expect(after.payments.length).toBeGreaterThan(d.payments.length);
    expect(after.statementImports[0]?.fileName).toBe('sample.csv');
    expect(after.auditEvents[0]?.action).toBe('statement.imported');
    const verified = after.claims.filter((c) => c.status === 'verified');
    expect(verified.length).toBe(p.counts.claimsVerified);
    expect(verified.length).toBeGreaterThan(0);
    const totalBefore = d.invoices.reduce((s, i) => s + i.balance, 0);
    const totalAfter = after.invoices.reduce((s, i) => s + i.balance, 0);
    expect(totalAfter).toBeLessThan(totalBefore);
    expect(tenantPaidDelta(after, 'ten_B-12')).toBeGreaterThan(0);
  });

  it('re-importing the same statement adds nothing new', () => {
    const d = applyImport(fresh(), importSample(fresh()));
    const again = importSample(d);
    expect(again.counts.fresh).toBe(0);
  });

  it('never keeps a raw phone number in queue rows', () => {
    const d = applyImport(fresh(), importSample(fresh()));
    const imported = d.unmatched.filter((u) => u.id.startsWith('imp_'));
    expect(imported.length).toBeGreaterThan(0);
    expect(JSON.stringify(imported)).not.toMatch(/\+?2547\d{8}/);
    expect(JSON.stringify(imported)).not.toMatch(/Receipt No/);
  });
});

describe('unmatched queue actions', () => {
  it('assign, split and ignore are audited', () => {
    const d0 = fresh();
    const [a, b, c] = d0.unmatched;
    if (!a || !b || !c) throw new Error('seed has unmatched rows');
    const t1 = d0.tenants[0]!;
    const t2 = d0.tenants[1]!;

    const assigned = assignUnmatched(d0, a.id, t1.id);
    expect(assigned.unmatched.some((u) => u.id === a.id)).toBe(false);
    expect(assigned.auditEvents[0]?.action).toBe('payment.matched');

    const split = splitUnmatched(d0, b.id, [
      { tenantId: t1.id, amount: 100 },
      { tenantId: t2.id, amount: b.amount - 100 },
    ]);
    expect(split.auditEvents[0]?.action).toBe('payment.split');
    expect(splitUnmatched(d0, b.id, [{ tenantId: t1.id, amount: b.amount }])).toBe(d0);

    const ignored = ignoreUnmatched(d0, c.id);
    expect(ignored.notRent.map((u) => u.id)).toContain(c.id);
    expect(ignored.auditEvents[0]?.action).toBe('payment.marked_not_rent');
  });

  it('overpayment becomes tenant credit', () => {
    const d0 = fresh();
    const um = d0.unmatched[0]!;
    const inv = d0.invoices.find((i) => i.balance > 0)!;
    const big = { ...d0, unmatched: [{ ...um, amount: inv.balance + 5000 }] };
    const after = assignUnmatched(big, um.id, inv.tenantId);
    expect(after.tenantCredits[inv.tenantId]).toBeGreaterThanOrEqual(5000);
  });
});

describe('tenant claims', () => {
  const sms = SAMPLE_CLAIMS[0]!.sms;

  it('validates the pasted SMS live', () => {
    expect(previewSms(sms)).toMatchObject({ ok: true, code: 'QFT4AB12CD', amount: 1_200_000 });
    expect(previewSms('hello').ok).toBe(false);
    expect(previewSms('').ok).toBe(false);
  });

  it('a claim never reduces the balance until approved or verified', () => {
    const d0 = fresh();
    const submitted = submitClaim(d0, {
      kind: 'sms',
      tenantId: 'ten_B-12',
      sms: SAMPLE_CLAIMS[2]!.sms,
    });
    const claim = submitted.claims[0]!;
    expect(claim.status).toBe('pending');
    expect(tenantPaidDelta(submitted, 'ten_B-12')).toBe(0);

    expect(approveClaim(submitted, claim.id, '')).toBe(submitted);
    const approved = approveClaim(submitted, claim.id, 'Checked against M-Pesa statement');
    expect(approved.claims[0]?.status).toBe('approved');
    expect(tenantPaidDelta(approved, 'ten_B-12')).toBeGreaterThan(0);
    expect(approved.payments[0]?.origin).toBe('claim');
    expect(approved.auditEvents[0]?.action).toBe('claim.approved');
  });

  it('reject needs a reason and posts nothing', () => {
    const d0 = fresh();
    const c = d0.claims[0]!;
    expect(rejectClaim(d0, c.id, '')).toBe(d0);
    const rejected = rejectClaim(d0, c.id, 'Code not on statement');
    expect(rejected.claims[0]?.status).toBe('rejected');
    expect(rejected.payments).toEqual(d0.payments);
  });
});

describe('review hardening', () => {
  it('masks phone-looking payer names', () => {
    expect(maskPayerName('254700123456 JOHN')).not.toMatch(/\d{7,}/);
    expect(maskPayerName('0700 123 456')).not.toMatch(/\d{4,}/);
  });

  it('flags a payee that is not one of the org payees', () => {
    const sms = SAMPLE_CLAIMS[0]!.sms;
    expect(previewSms(sms, ['SOMEONE ELSE'])).toMatchObject({ ok: true, payeeMismatch: true });
    expect(previewSms(sms, ['RIVERSIDE COURT'])).toMatchObject({ ok: true, payeeMismatch: false });
  });

  it('persists conflicts to the review queue and audits the alert', () => {
    const d1 = applyImport(fresh(), importSample(fresh()));
    const tampered = SAMPLE_MPESA_STATEMENT_CSV.replace('"15,500.00"', '"99,000.00"');
    const parsed = parseStatement('mpesa', tampered);
    if (!parsed.ok) throw new Error(parsed.message);
    const p = previewImport(d1, parsed.value, { kind: 'mpesa', fileName: 'again.csv' });
    expect(p.counts.alerts).toBeGreaterThan(0);
    const d2 = applyImport(d1, p);
    expect(d2.unmatched.some((u) => u.reason === 'conflict')).toBe(true);
    expect(d2.auditEvents.some((e) => e.action === 'statement.alert')).toBe(true);
  });
});
