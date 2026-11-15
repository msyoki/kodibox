import { demoSeed } from '@kodibox/demo';
import { describe, expect, it } from 'vitest';
import { checkSms, maskPayerName, runDemoImport, seedClaims } from './payments-engine';

const fmt = (m: bigint) => `KES ${m / 100n}`;

describe('runDemoImport', () => {
  const run = runDemoImport(demoSeed, '2026-11-02T07:00:00Z');

  it('summarises the sample statement', () => {
    const s = run.summary;
    expect(s.duplicates).toBe(1);
    expect(s.newLines).toBeGreaterThan(0);
    expect(s.autoMatched + s.needsReview).toBe(s.newLines);
    expect(run.unmatched).toHaveLength(s.needsReview);
  });

  it('suggests a unit when the typed reference contains its code', () => {
    const line = run.unmatched.find((u) => u.accountRef === 'RENT B12');
    expect(line?.suggestions[0]?.unitCode).toBe('B-12');
  });

  it('lets the statement verify the matching sample claim', () => {
    expect(run.claimOutcomes['claim_1']?.kind).toBe('verified');
    const claims = seedClaims(demoSeed, run.claimOutcomes);
    expect(claims.find((c) => c.code === 'QFT4AB12CD')?.status).toBe('verified_statement');
    expect(claims.some((c) => c.status === 'pending')).toBe(true);
  });
});

describe('maskPayerName', () => {
  it('keeps first name and initial and drops phone-like tokens', () => {
    expect(maskPayerName('DOE, JANE')).toBe('Doe J.');
    expect(maskPayerName('JOHN 254700000001 KAMAU')).toBe('John K.');
    expect(maskPayerName('254700000001')).toBe('Unknown payer');
    expect(maskPayerName(undefined)).toBe('Unknown payer');
  });
});

describe('checkSms', () => {
  const sms =
    'QFT4AB12CD Confirmed. Ksh12,000.00 sent to RIVERSIDE COURT for account B-12 on 11/3/26 at 9:14 AM. New M-PESA balance is Ksh25,000.00.';

  it('reads code and amount and warns on a different amount', () => {
    const r = checkSms(sms, 'B-12', 1_670_000n, fmt);
    expect(r.ok).toBe(true);
    expect(r.line?.externalRef).toBe('QFT4AB12CD');
    expect(r.warnings.some((w) => w.includes('differs'))).toBe(true);
  });

  it('warns when the account reference is not the unit code', () => {
    const r = checkSms(sms, 'C-03', 1_200_000n, fmt);
    expect(r.warnings.some((w) => w.includes('unit code'))).toBe(true);
  });

  it('warns when the payee is not the landlord', () => {
    const other = sms.replace('RIVERSIDE COURT', 'SOME SHOP');
    const r = checkSms(other, 'B-12', 1_200_000n, fmt);
    expect(r.warnings.some((w) => w.includes('SOME SHOP'))).toBe(true);
  });

  it('gives a friendly error for very long text', () => {
    const r = checkSms('x'.repeat(1001), 'B-12', 0n, fmt);
    expect(r.ok).toBe(false);
    expect(r.error).toContain('too long');
  });

  it('rejects text that is not an M-Pesa message', () => {
    expect(checkSms('hello', 'B-12', 0n, fmt).ok).toBe(false);
  });
});
