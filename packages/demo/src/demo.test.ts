import { describe, expect, it } from 'vitest';
import {
  BALANCE,
  DUE_LINES,
  HOME_LINES,
  allocatePayment,
  demoSeed,
  getCollection,
  getLedger,
  getManagerHome,
  listCashEntries,
  listMyTickets,
  DEMO_TENANT_ID,
  sumMinor,
  shillings,
} from './index';

describe('demo seed money', () => {
  it('stores every money field as bigint', () => {
    for (const inv of demoSeed.invoices) {
      expect(typeof inv.total).toBe('bigint');
      expect(typeof inv.paid).toBe('bigint');
      expect(typeof inv.balance).toBe('bigint');
      for (const line of inv.lines) expect(typeof line.amount).toBe('bigint');
      expect(inv.total - inv.paid).toBe(inv.balance);
      expect(sumMinor(inv.lines.map((l) => l.amount))).toBe(inv.total);
    }
    for (const p of demoSeed.payments) expect(typeof p.amount).toBe('bigint');
    for (const u of demoSeed.unmatched) expect(typeof u.amount).toBe('bigint');
    for (const u of demoSeed.units) expect(typeof u.rent).toBe('bigint');
    for (const m of demoSeed.meterReadings) expect(typeof m.ratePerUnit).toBe('bigint');
  });

  it('keeps counts as plain numbers', () => {
    const m = demoSeed.meterReadings[0];
    expect(typeof m?.previous).toBe('number');
  });

  it('matches the calibrated November totals', () => {
    const c = getCollection(demoSeed);
    expect(c.expected).toBe(shillings(1_284_000));
    expect(c.collected).toBe(shillings(1_032_500));
    expect(c.outstanding).toBe(c.expected - c.collected);
    expect(sumMinor(c.byProperty.map((p) => p.collected))).toBe(c.collected);
  });

  it('uses obviously fake contact details', () => {
    for (const t of demoSeed.tenants) {
      expect(t.phone.startsWith('+254700')).toBe(true);
      expect(t.nationalId.startsWith('000')).toBe(true);
    }
  });
});

describe('tenant persona', () => {
  it('adds up the balance from its lines', () => {
    expect(BALANCE).toBe(shillings(16_700));
    expect(sumMinor(HOME_LINES.map((l) => l.amount))).toBe(BALANCE);
    expect(sumMinor(DUE_LINES.map((l) => l.amount))).toBe(BALANCE);
  });

  it('matches the seeded B-12 invoice balance', () => {
    const peter = demoSeed.invoices.filter((i) => i.tenantId === DEMO_TENANT_ID);
    expect(sumMinor(peter.map((i) => i.balance))).toBe(BALANCE);
  });

  it('allocates oldest charges first and never goes negative', () => {
    const part = allocatePayment(shillings(1_300));
    expect(part.lines.map((l) => l.label)).toEqual([
      'Water · October',
      'Late fee · October (part)',
    ]);
    expect(sumMinor(part.lines.map((l) => l.amount))).toBe(shillings(1_300));
    expect(part.newBalance).toBe(BALANCE - shillings(1_300));
    expect(allocatePayment(BALANCE + shillings(500)).newBalance).toBe(0n);
  });

  it('keeps ledger running balances consistent', () => {
    for (const month of ['nov', 'oct', 'sep'] as const) {
      const rows = getLedger(month);
      const net = sumMinor(rows.map((r) => r.delta));
      expect(rows[0]?.balance).toBe(net);
    }
    expect(getLedger('nov')[0]?.balance).toBe(BALANCE);
    expect(getLedger('oct')[0]?.balance).toBe(0n);
  });

  it('hides internal ticket messages from the tenant', () => {
    const tickets = listMyTickets(DEMO_TENANT_ID, demoSeed, []);
    expect(tickets.length).toBeGreaterThan(0);
    for (const t of tickets) for (const m of t.messages) expect(m.internal).toBe(false);
  });
});

describe('manager and caretaker data', () => {
  it('summarises pending cash and unmatched payments', () => {
    const home = getManagerHome(demoSeed);
    const pending = listCashEntries(demoSeed).filter((c) => c.status === 'awaiting_approval');
    expect(home.cashCount).toBe(pending.length);
    expect(home.cashTotal).toBe(sumMinor(pending.map((c) => c.amount)));
    expect(home.unmatchedTotal).toBe(sumMinor(demoSeed.unmatched.map((u) => u.amount)));
    expect(home.unmatchedTotal).toBe(shillings(74_200));
  });
});

describe('reconciliation samples', () => {
  it('parse with the core engine', async () => {
    const { parseMpesaSms, parseMpesaStatementCsv } = await import('@kodibox/core');
    const { createTestPhoneHasher } = await import('@kodibox/core/testing');
    const { SAMPLE_CLAIMS, SAMPLE_MPESA_STATEMENT_CSV } = await import('./index');
    const stmt = parseMpesaStatementCsv(SAMPLE_MPESA_STATEMENT_CSV, {
      hashPhone: createTestPhoneHasher(),
      now: new Date('2026-03-15T00:00:00Z'),
    });
    expect(stmt.ok && stmt.value.lines.length).toBe(7);
    expect(stmt.ok && stmt.value.rowErrors.length).toBe(1);
    for (const c of SAMPLE_CLAIMS)
      expect(parseMpesaSms(c.sms, { now: new Date('2026-03-15T00:00:00Z') }).ok).toBe(true);
  });
});
