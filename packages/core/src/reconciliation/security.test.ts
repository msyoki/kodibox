import { describe, expect, it } from 'vitest';
import { MPESA_STATEMENT_CSV, SMS_VARIANTS } from './__fixtures__';
import { allocate } from './allocate';
import { DEFAULT_CSV_LIMITS, parseCsv } from './csv';
import { dedupe, dedupeKey } from './dedupe';
import { match } from './match';
import {
  isFormulaLike,
  neutraliseForSpreadsheet,
  normaliseExternalRef,
  parseAmountMinor,
} from './normalize';
import { parseBankCsv, parseMpesaSms as parseMpesaSmsRaw, parseMpesaStatementCsv } from './parsers';
import { reconcile } from './reconcile';
import { rawLinesById, toPaymentRecordWithRaw } from './records';
import { createTestPhoneHasher } from './testing';
import type { MatchCandidate, OpenInvoice, PaymentRecord, SmsParseOptions } from './types';

const hashPhone = createTestPhoneHasher();
const NOW = new Date('2026-03-15T00:00:00Z');
const parseMpesaSms = (t: string, o: Partial<SmsParseOptions> = {}) =>
  parseMpesaSmsRaw(t, { now: NOW, ...o });
const opts = { hashPhone, now: new Date('2026-03-15T00:00:00Z') };
const HEAD =
  'Receipt No.,Completion Time,Details,Transaction Status,Paid In,Other Party Info,A/C No.';
const stmt = (...rows: string[]): string => [HEAD, ...rows].join('\n');

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

const invoice = (invoiceId: string, balance: bigint, leaseId = 'L1'): OpenInvoice => ({
  tenantId: 'T1',
  leaseId,
  unitCode: 'B-12',
  invoiceId,
  balance,
  dueDate: '2026-03-05',
});

const cand = (invoices: OpenInvoice[], sources = ['acc1'], leaseId = 'L1'): MatchCandidate => ({
  tenantId: 'T1',
  leaseId,
  unitCode: 'B-12',
  monthlyRent: 1_200_000n,
  paymentSourceIds: sources,
  knownPayerPhoneHashes: [],
  openInvoices: invoices,
});

const json = (v: unknown): string =>
  JSON.stringify(v, (_, x: unknown) => (typeof x === 'bigint' ? x.toString() : x));

describe('H1: unverified claims are never allocated', () => {
  it('sends a claim to unmatched with a suggestion and no allocations', () => {
    const claim = rec({ id: 'c1', source: 'claim', status: 'unverified', accountRef: 'B-12' });
    const r = reconcile([claim], { existing: [], candidates: [cand([invoice('i1', 1_200_000n)])] });
    expect(r.matched).toHaveLength(0);
    expect(r.allocations).toHaveLength(0);
    expect(r.unmatched[0]?.reason).toBe('unverified_claim');
    expect(r.unmatched[0]?.match?.target?.leaseId).toBe('L1');
  });

  it('a claim verified by a matching statement line is allocated once, via the statement', () => {
    const claim = rec({ id: 'c1', source: 'claim', status: 'unverified', accountRef: 'B-12' });
    const line = rec({ id: 'l1', accountRef: 'B-12' });
    const r = reconcile([line], {
      existing: [claim],
      candidates: [cand([invoice('i1', 1_200_000n)])],
    });
    expect(r.matched.map((m) => m.record.id)).toEqual(['c1']);
    expect(r.allocations).toHaveLength(1);
  });

  it('reversed or rejected incoming records are not allocated', () => {
    const r = reconcile([rec({ id: 'x', status: 'reversed', accountRef: 'B-12' })], {
      existing: [],
      candidates: [cand([invoice('i1', 1_200_000n)])],
    });
    expect(r.allocations).toHaveLength(0);
    expect(r.unmatched[0]?.reason).toBe('inactive_record');
  });
});

describe('H2: dedupe conflicts and alerts', () => {
  const claim = rec({ id: 'c1', source: 'claim', status: 'unverified', accountRef: 'B-12' });

  it('amount mismatch: the statement line wins, the claim is flagged for rejection', () => {
    const r = dedupe([claim], [rec({ id: 'l1', amount: 999n })]);
    expect(r.merges).toHaveLength(0);
    expect(r.conflicts[0]).toMatchObject({
      fields: ['amount'],
      kind: 'claim_conflict',
      claimToReject: 'c1',
    });
    expect(r.alerts).toHaveLength(0);
    expect(r.fresh.map((x) => x.id)).toEqual(['l1']);
  });

  it('conflict against a verified record raises an alert', () => {
    const verified = rec({ id: 'v1' });
    const r = dedupe(
      [verified],
      [rec({ id: 'c2', source: 'claim', status: 'unverified', amount: 5n })],
    );
    expect(r.conflicts).toHaveLength(1);
    expect(r.alerts[0]?.kind).toBe('conflict_with_verified');
    expect(r.alerts[0]?.of.id).toBe('v1');
  });

  it('paidAt tolerance: 10 minutes for M-Pesa, one day for bank refs', () => {
    expect(
      dedupe([claim], [rec({ id: 'a', paidAt: '2026-03-11T06:20:00.000Z' })]).merges,
    ).toHaveLength(1);
    expect(
      dedupe([claim], [rec({ id: 'b', paidAt: '2026-03-11T06:30:00.000Z' })]).conflicts[0]?.fields,
    ).toEqual(['paidAt']);
    const bank = rec({ id: 'k1', externalRef: 'FT26070ABC12', sourceKind: 'bank' });
    expect(
      dedupe(
        [bank],
        [
          rec({
            id: 'k2',
            externalRef: 'FT26070ABC12',
            sourceKind: 'bank',
            paidAt: '2026-03-11T20:00:00.000Z',
          }),
        ],
      ).duplicates,
    ).toHaveLength(1);
    expect(
      dedupe(
        [bank],
        [
          rec({
            id: 'k3',
            externalRef: 'FT26070ABC12',
            sourceKind: 'bank',
            paidAt: '2026-03-13T06:14:00.000Z',
          }),
        ],
      ).conflicts,
    ).toHaveLength(1);
  });

  it('account reference mismatch is a conflict', () => {
    const r = dedupe([claim], [rec({ id: 'l', accountRef: 'C-03' })]);
    expect(r.conflicts[0]?.fields).toEqual(['accountRef']);
  });

  it('reversed or rejected existing records do not block a genuine line', () => {
    for (const status of ['reversed', 'rejected'] as const) {
      const r = dedupe([rec({ id: 'old', status })], [rec({ id: 'new' })]);
      expect(r.fresh.map((x) => x.id)).toEqual(['new']);
    }
  });

  it('conflicts and alerts are exposed by reconcile', () => {
    const r = reconcile([rec({ id: 'n', amount: 5n })], {
      existing: [rec({ id: 'v1' })],
      candidates: [],
    });
    expect(r.conflicts).toHaveLength(1);
    expect(r.alerts).toHaveLength(1);
    expect(r.matched).toHaveLength(0);
  });
});

describe('H3: ReDoS and size caps', () => {
  const fast = (fn: () => unknown, ms = 100): void => {
    const t = performance.now();
    fn();
    expect(performance.now() - t).toBeLessThan(ms);
  };

  it('rejects SMS over 1,000 chars before matching', () => {
    const r = parseMpesaSms('QFT4AB12CD Confirmed. Ksh1.00 sent to ' + 'A'.repeat(100_000));
    expect(!r.ok && r.error.code).toBe('sms_too_long');
  });

  it('pathological SMS under the cap finishes fast', () => {
    const inputs = [
      'QFT4AB12CD Confirmed. Ksh1.00 sent to ' + ' for account '.repeat(70),
      'QFT4AB12CD Confirmed. Ksh1.00 paid to ' + 'A '.repeat(490),
      'QFT4AB12CD Confirmed. Ksh' + '1,'.repeat(480),
      'QFT4AB12CD Confirmed. Ksh1.00 sent to X for account ' + 'B'.repeat(900),
    ];
    for (const i of inputs) fast(() => parseMpesaSms(i));
  });

  it('rejects CSV cells over 512 chars (100 KB cell) quickly', () => {
    const csv = stmt(`QFT4AB12CD,2026-03-11 09:00:00,${'x'.repeat(100_000)},Completed,1.00,,`);
    fast(() => {
      const r = parseMpesaStatementCsv(csv, opts);
      expect(!r.ok && r.error.code).toBe('csv_cell_too_long');
    });
  });

  it('pathological other-party / details cells finish fast', () => {
    const rows = [
      `QFT4AB12CD,2026-03-11 09:00:00,${'Acc '.repeat(120)},Completed,1.00,${'1'.repeat(500)},`,
      `QFT4AB12CE,2026-03-11 09:00:00,Acc ${'-'.repeat(480)},Completed,1.00,254700000001 -${' '.repeat(480)},`,
    ];
    fast(() => parseMpesaStatementCsv(stmt(...rows), opts));
  });

  it('fuzz: random inputs never throw and stay fast', () => {
    let seed = 7;
    const rnd = (n: number): number => {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      return seed % n;
    };
    const alphabet = ' .,"AB12:-/Ksh confirmed sent to for account on at PM\n';
    const t = performance.now();
    for (let i = 0; i < 300; i++) {
      const s = Array.from({ length: rnd(900) }, () => alphabet[rnd(alphabet.length)]).join('');
      expect(() => {
        parseMpesaSms(s);
        parseMpesaSms(`QFT4AB12CD Confirmed. Ksh1.00 sent to ${s.slice(0, 400)}`);
        parseMpesaStatementCsv(stmt(s), opts);
      }).not.toThrow();
    }
    expect(performance.now() - t).toBeLessThan(2000);
  });
});

describe('M4: CSV limits and strictness', () => {
  it('fails closed on oversize, too many rows, too many cells, long cells', () => {
    const code = (r: ReturnType<typeof parseCsv>): string | undefined =>
      r.ok ? undefined : r.error.code;
    expect(code(parseCsv('a'.repeat(DEFAULT_CSV_LIMITS.maxChars + 1)))).toBe('csv_too_large');
    expect(code(parseCsv('a\nb\nc', { ...DEFAULT_CSV_LIMITS, maxRows: 2 }))).toBe(
      'csv_too_many_rows',
    );
    expect(code(parseCsv(','.repeat(60)))).toBe('csv_too_many_cells');
    expect(code(parseCsv('x'.repeat(513)))).toBe('csv_cell_too_long');
  });

  it('unterminated and stray quotes are errors', () => {
    const code = (s: string): string | undefined => {
      const r = parseCsv(s);
      return r.ok ? undefined : r.error.code;
    };
    expect(code('a,"unterminated')).toBe('csv_unterminated_quote');
    expect(code('a,b"c')).toBe('csv_stray_quote');
    expect(code('a,"b"c')).toBe('csv_stray_quote');
    expect(code('a,"b"",c"')).toBeUndefined();
  });

  it('statement parsers surface the csv error', () => {
    expect(parseMpesaStatementCsv('"oops', opts).ok).toBe(false);
  });
});

describe('M5: raw lines are kept out of reconcile output', () => {
  it('no raw line, phone number or rawLine key leaks; raw lines are available separately', () => {
    const parsed = parseMpesaStatementCsv(MPESA_STATEMENT_CSV, opts);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const entries = parsed.value.lines.map((line, i) =>
      toPaymentRecordWithRaw(line, { id: `r${i}`, source: 'import', sourceAccountId: 'acc1' }),
    );
    const raw = rawLinesById(entries);
    expect([...raw.values()].some((v) => v.includes('254700000001'))).toBe(true);
    const out = reconcile(
      entries.map((e) => e.record),
      {
        existing: [],
        candidates: [cand([invoice('i1', 1_200_000n)])],
      },
    );
    const text = json(out);
    expect(text).not.toMatch(/2547\d{8}/);
    expect(text).not.toContain('rawLine');
    expect(text).not.toContain('Pay Bill Online');
  });
});

describe('M6: phone leakage', () => {
  const mapping = {
    date: 'Date',
    credit: 'Credit',
    reference: 'Ref',
    description: 'Narrative',
    accountRef: 'Account',
    dateFormat: 'DD/MM/YYYY',
  } as const;

  it('hashes and masks phones in bank narrative and account reference', () => {
    const csv = [
      'Date,Narrative,Ref,Credit,Account',
      '11/03/2026,FROM 0700000011 JOHN,FT26070ABC12,"1,000.00",B-12',
      '11/03/2026,TRANSFER,FT26070ABC13,"2,000.00",0700000012',
    ].join('\n');
    const r = parseBankCsv(csv, mapping, opts);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [a, b] = r.value.lines;
    expect(a?.payerPhoneHash).toBe(hashPhone('+254700000011'));
    expect(a?.payerName).toBe('FROM +2547****0011 JOHN');
    expect(b?.accountRef).toBeUndefined();
    expect(b?.payerPhoneHash).toBe(hashPhone('+254700000012'));
    const { rawLine: _raw, ...safe } = a!;
    void _raw;
    expect(json(safe)).not.toContain('0700000011');
  });

  it('a phone typed as the statement account reference is not stored raw', () => {
    const r = parseMpesaStatementCsv(
      stmt('QFT4AB12CD,2026-03-11 09:00:00,x,Completed,100.00,,0700000013'),
      opts,
    );
    const line = r.ok ? r.value.lines[0] : undefined;
    expect(line?.accountRef).toBeUndefined();
    expect(line?.payerPhoneHash).toBe(hashPhone('+254700000013'));
  });
});

describe('M7: hasher is required and branded', () => {
  it('type-level', () => {
    // @ts-expect-error hashPhone is required
    parseMpesaStatementCsv('x', {});
    // @ts-expect-error a plain function is not a KeyedPhoneHasher
    parseMpesaStatementCsv('x', { hashPhone: (s: string) => s });
    expect(createTestPhoneHasher()('+254700000001')).toMatch(/^test1:/);
  });
});

describe('M8: payment source filtering', () => {
  it('never matches a lease that does not accept the record source account', () => {
    const r = match(rec({ id: 'x', sourceAccountId: 'landlordB', accountRef: 'B-12' }), [
      cand([invoice('i', 1n)], ['landlordA']),
    ]);
    expect(r.target).toBeNull();
    const ok = match(rec({ id: 'y', sourceAccountId: 'landlordA', accountRef: 'B-12' }), [
      cand([invoice('i', 1n)], ['landlordA']),
    ]);
    expect(ok.target?.leaseId).toBe('L1');
  });

  it('reconcile leaves cross-landlord payments unmatched', () => {
    const r = reconcile([rec({ id: 'x', sourceAccountId: 'landlordB', accountRef: 'B-12' })], {
      existing: [],
      candidates: [cand([invoice('i', 1_200_000n)], ['landlordA'])],
    });
    expect(r.allocations).toHaveLength(0);
    expect(r.unmatched).toHaveLength(1);
  });
});

describe('M9: reference normalisation and M-Pesa keys', () => {
  it('normalises case, whitespace, punctuation and unicode width', () => {
    const base = dedupeKey(rec({ id: 'a' }));
    for (const ref of [' qft4-ab12cd ', 'QFT4 AB12CD', 'ＱＦＴ４ＡＢ１２ＣＤ']) {
      expect(dedupeKey(rec({ id: 'b', externalRef: ref }))).toBe(base);
    }
    expect(normaliseExternalRef('a-b c')).toBe('ABC');
  });

  it('M-Pesa refs dedupe across source accounts; bank refs do not', () => {
    expect(
      dedupe([rec({ id: 'a', sourceAccountId: 'A' })], [rec({ id: 'b', sourceAccountId: 'B' })])
        .duplicates,
    ).toHaveLength(1);
    const bank = (id: string, sourceAccountId: string): PaymentRecord =>
      rec({ id, sourceAccountId, sourceKind: 'bank', externalRef: 'FT26070ABC12' });
    expect(dedupe([bank('a', 'A')], [bank('b', 'B')]).fresh).toHaveLength(1);
  });

  it('a claim for source A meets a statement line for source B', () => {
    const claim = rec({ id: 'c', source: 'claim', status: 'unverified', sourceAccountId: 'A' });
    expect(dedupe([claim], [rec({ id: 'l', sourceAccountId: 'B' })]).merges).toHaveLength(1);
  });

  it('invalid M-Pesa receipts are row errors', () => {
    const r = parseMpesaStatementCsv(
      stmt(
        'SHORT1,2026-03-11 09:00:00,x,Completed,100.00,,',
        'QFT4-AB12C,2026-03-11 09:00:00,x,Completed,100.00,,',
      ),
      opts,
    );
    expect(r.ok && r.value.rowErrors.map((e) => e.code)).toEqual([
      'invalid_receipt',
      'invalid_receipt',
    ]);
  });
});

describe('M10: amount grammar', () => {
  it.each([
    '1,2,3',
    '12,34.00',
    '1,2345',
    ',100',
    '100,',
    '1 000',
    '1234567890123',
    '1,234,567,890,123',
  ])('rejects %s', (v) => expect(parseAmountMinor(v)).toBeNull());
  it.each([
    ['1,234,567.89', 123_456_789n],
    ['1234567', 123_456_700n],
    ['999,999,999,999.99', 99_999_999_999_999n],
  ])('accepts %s', (v, n) => expect(parseAmountMinor(v)).toBe(n));
  it('honours a configurable ceiling', () => {
    expect(parseAmountMinor('1000000', 6)).toBeNull();
    expect(parseAmountMinor('999999', 6)).toBe(99_999_900n);
  });
  it('implausible statement amounts are row errors', () => {
    const r = parseMpesaStatementCsv(
      stmt('QFT4AB12CD,2026-03-11 09:00:00,x,Completed,"1,2,3",,'),
      opts,
    );
    expect(r.ok && r.value.rowErrors[0]?.code).toBe('invalid_amount');
  });
});

describe('M11: formula and shape validation', () => {
  it('detects and neutralises formula-like values', () => {
    for (const v of ['=1+1', '+1', '-1', '@x', '\tx', '\rx']) {
      expect(isFormulaLike(v)).toBe(true);
      expect(neutraliseForSpreadsheet(v)).toBe(`'${v}`);
    }
    expect(neutraliseForSpreadsheet('JOHN')).toBe('JOHN');
    expect(isFormulaLike('')).toBe(false);
  });

  it('rejects malformed account refs and flags formula-like names', () => {
    const r = parseMpesaStatementCsv(
      stmt(
        'QFT4AB12CD,2026-03-11 09:00:00,x,Completed,100.00,,=cmd|x',
        'QFT4AB12CE,2026-03-11 09:00:00,x,Completed,100.00,254700000001 - =EVIL,B-12',
      ),
      opts,
    );
    expect(r.ok && r.value.rowErrors.map((e) => e.code)).toEqual(['invalid_account_ref']);
    expect(r.ok && r.value.lines[0]?.flags).toEqual(['formula_like']);
  });
});

describe('L12: possible duplicates', () => {
  it('keeps same-batch fingerprint twins for review with their ordinal', () => {
    const base = { externalRef: undefined, accountRef: 'B-12' } as const;
    const r = dedupe([], [rec({ id: 'a', ...base }), rec({ id: 'b', ...base })]);
    expect(r.fresh.map((x) => x.id)).toEqual(['a']);
    expect(r.possibleDuplicates).toEqual([
      {
        record: expect.objectContaining({ id: 'b' }),
        of: expect.objectContaining({ id: 'a' }),
        ordinal: 2,
      },
    ]);
    expect(r.duplicates).toHaveLength(0);
  });
});

describe('L13: duplicate invoice ids', () => {
  it('allocate rejects them', () => {
    const r = allocate(10n, [
      { invoiceId: 'a', balance: 5n, dueDate: '2026-01-01' },
      { invoiceId: 'a', balance: 5n, dueDate: '2026-02-01' },
    ]);
    expect(!r.ok && r.error.code).toBe('duplicate_invoice');
  });

  it('reconcile reports it and allocates nothing; same id on two leases is independent', () => {
    const bad = reconcile([rec({ id: 'p', accountRef: 'B-12' })], {
      existing: [],
      candidates: [cand([invoice('a', 5n), invoice('a', 5n)])],
    });
    expect(bad.allocations).toHaveLength(0);
    expect(bad.unmatched[0]?.reason).toBe('duplicate_invoice');

    const two = reconcile(
      [
        rec({ id: 'p1', accountRef: 'B-12', amount: 100n }),
        rec({
          id: 'p2',
          externalRef: 'QFT4AB12CE',
          accountRef: 'C-03',
          amount: 100n,
          paidAt: '2026-03-11T07:00:00.000Z',
        }),
      ],
      {
        existing: [],
        candidates: [
          cand([invoice('same', 100n, 'L1')], ['acc1'], 'L1'),
          { ...cand([invoice('same', 100n, 'L2')], ['acc1'], 'L2'), unitCode: 'C-03' },
        ],
      },
    );
    expect(two.matched).toHaveLength(2);
    expect(two.allocations.map((a) => a.amount)).toEqual([100n, 100n]);
  });
});

describe('L14: dates', () => {
  const sms = (when: string): string =>
    `QFT4AB12CD Confirmed. Ksh100.00 sent to RIVERSIDE COURT for account B-12 on ${when}. New balance.`;

  it('validates 12-hour clock and four-digit years', () => {
    expect(parseMpesaSms(sms('11/3/26 at 13:14 PM')).ok).toBe(false);
    expect(parseMpesaSms(sms('11/3/26 at 0:14 AM')).ok).toBe(false);
    const r = parseMpesaSms(sms('11/3/2026 at 12:14 PM'));
    expect(r.ok && r.value.lines[0]?.paidAt).toBe('2026-03-11T09:14:00.000Z');
  });

  it('bounds paidAt to [now-2y, now+1d] with an injected clock', () => {
    const now = new Date('2026-03-15T00:00:00Z');
    expect(parseMpesaSms(sms('11/3/2020 at 9:14 AM'), { now }).ok).toBe(false);
    expect(parseMpesaSms(sms('20/3/2026 at 9:14 AM'), { now }).ok).toBe(false);
    expect(parseMpesaSms(sms('11/3/2026 at 9:14 AM'), { now }).ok).toBe(true);
    const r = parseMpesaStatementCsv(
      stmt('QFT4AB12CD,2020-03-11 09:00:00,x,Completed,100.00,,'),
      opts,
    );
    expect(r.ok && r.value.rowErrors[0]?.code).toBe('date_out_of_range');
  });
});

describe('L15: expected payees', () => {
  it('flags payee mismatch', () => {
    const a = parseMpesaSms(SMS_VARIANTS.paybill, { expectedPayees: ['Riverside Court'] });
    expect(a.ok && a.value.payeeMismatch).toBe(false);
    const b = parseMpesaSms(SMS_VARIANTS.paybill, { expectedPayees: ['Other Landlord'] });
    expect(b.ok && b.value.payeeMismatch).toBe(true);
    const c = parseMpesaSms(SMS_VARIANTS.paybill);
    expect(c.ok && c.value.payeeMismatch).toBeUndefined();
  });
});

describe('L16: row errors do not echo cell content', () => {
  it('reports code and row only', () => {
    const r = parseMpesaStatementCsv(
      stmt(
        'QFT4AB12CD,2026-03-11 09:00:00,x,Completed,SECRETAMOUNT99,,',
        'QFT4AB12CE,SECRETDATE77,x,Completed,5.00,,',
        'QFT4AB12CF,2026-03-11 09:00:00,x,Completed,5.00,,SECRET/ACC!!',
      ),
      opts,
    );
    expect(r.ok).toBe(true);
    const text = r.ok ? json(r.value.rowErrors) : '';
    expect(text).not.toContain('SECRET');
    expect(r.ok && r.value.rowErrors).toHaveLength(3);
  });
});
