/**
 * The deterministic demo dataset lives in `@kodibox/demo` (shared with the mobile app) with
 * bigint money. The web prototype works on number cents, so convert once at this boundary.
 * Payment-evidence fields (claims, payment instructions, statement imports) are web-only demo
 * state seeded here from `SAMPLE_CLAIMS`.
 */
import { parseSms } from '../features/payments/reconcile-adapter';
import { DEMO_ORG_ID, DEMO_TODAY, SAMPLE_CLAIMS, demoSeed } from '@kodibox/demo';
import { toNumbers } from './adapt';
import type { DemoData, PaymentClaim } from './types';

export { DEMO_ORG_ID, DEMO_TODAY };

const base = toNumbers(demoSeed);

const seedClaims = (): PaymentClaim[] =>
  SAMPLE_CLAIMS.map((c, i): PaymentClaim => {
    const unit = base.units.find((u) => u.code === c.unitCode);
    const tenant = unit?.tenantId ? base.tenants.find((t) => t.id === unit.tenantId) : undefined;
    const parsed = parseSms(c.sms);
    const line = parsed.ok ? parsed.value.lines[0] : undefined;
    return {
      id: `clm_${i + 1}`,
      ...(tenant ? { tenantId: tenant.id } : {}),
      tenantName: tenant?.name ?? c.tenantName,
      unitCode: c.unitCode,
      kind: 'sms',
      sms: c.sms,
      ...(line
        ? {
            code: line.externalRef,
            amount: Number(line.amount),
            paidAt: line.paidAt,
          }
        : {}),
      status: 'pending',
      submittedAt: `${DEMO_TODAY}T0${8 + i}:30:00+03:00`,
    };
  });

export const seedData: DemoData = {
  ...base,
  notRent: [],
  claims: seedClaims(),
  paymentInstructions: [
    {
      id: 'pi_org',
      scope: 'org',
      mpesaKind: 'paybill',
      mpesaNumber: base.org.paybill,
      payeeName: 'RIVERSIDE COURT',
      accountRule: 'unit_code',
      bankName: 'Demo Bank',
      bankAccount: '0000000000',
      bankBranch: 'Westlands',
    },
  ],
  importReminder: 'weekly',
  statementImports: [
    {
      id: 'imp_seed_1',
      at: '2026-10-30T09:05:00+03:00',
      sourceLabel: 'M-Pesa paybill',
      fileName: 'mpesa-statement-october.csv',
      fresh: 142,
      duplicates: 0,
      autoMatched: 136,
      needsReview: 6,
      rowErrors: 0,
      claimsVerified: 0,
    },
  ],
  tenantCredits: {},
};
