import { describe, expect, it } from 'vitest';
import {
  BANK_CSV,
  BANK_MAPPING,
  MPESA_STATEMENT_CSV,
  NOT_AN_SMS,
  SMS_VARIANTS,
} from './__fixtures__';
import { parseCsv as parseCsvResult } from './csv';
import { createTestPhoneHasher } from './testing';
import type { SmsParseOptions } from './types';
import {
  compactRef,
  maskPhone,
  nairobiToUtcIso,
  normaliseAccountRef,
  normalisePhone,
  parseAmountMinor,
} from './normalize';
import { parseBankCsv, parseMpesaSms as parseMpesaSmsRaw, parseMpesaStatementCsv } from './parsers';

const hashPhone = createTestPhoneHasher();
const NOW = new Date('2026-03-15T00:00:00Z');
const parseMpesaSms = (t: string, o: Partial<SmsParseOptions> = {}) =>
  parseMpesaSmsRaw(t, { now: NOW, ...o });
const opts = { hashPhone, now: new Date('2026-03-15T00:00:00Z') };
const parseCsv = (t: string) => {
  const r = parseCsvResult(t);
  if (!r.ok) throw new Error(r.error.code);
  return r.value;
};

describe('normalisers', () => {
  it('normalises account refs', () => {
    for (const raw of ['b12', 'B 12', 'b-12', ' B-12 ', 'b_12'])
      expect(normaliseAccountRef(raw)).toBe('B-12');
    expect(normaliseAccountRef('rent b12')).toBe('RENT B12');
    expect(compactRef('b-12')).toBe('B12');
  });

  it('normalises phones to E.164 and masks them', () => {
    expect(normalisePhone('0700000001')).toBe('+254700000001');
    expect(normalisePhone('254700000001')).toBe('+254700000001');
    expect(normalisePhone('+254 700 000 001')).toBe('+254700000001');
    expect(normalisePhone('700000001')).toBe('+254700000001');
    expect(normalisePhone('2547****0010')).toBeNull();
    expect(normalisePhone('12345')).toBeNull();
    expect(maskPhone('+254700000001')).toBe('+2547****0001');
  });

  it('parses amounts without floats', () => {
    expect(parseAmountMinor('12,000.00')).toBe(1_200_000n);
    expect(parseAmountMinor('Ksh 12,000')).toBe(1_200_000n);
    expect(parseAmountMinor('1,250.5')).toBe(125_050n);
    expect(parseAmountMinor('-5.00')).toBe(-500n);
    expect(parseAmountMinor('12,00x.00')).toBeNull();
    expect(parseAmountMinor('1.234')).toBeNull();
    expect(parseAmountMinor('')).toBeNull();
  });

  it('converts Nairobi local time to UTC and rejects impossible dates', () => {
    expect(nairobiToUtcIso(2026, 3, 11, 9, 14, 2)).toBe('2026-03-11T06:14:02.000Z');
    expect(nairobiToUtcIso(2026, 3, 11, 1, 0, 0)).toBe('2026-03-10T22:00:00.000Z');
    expect(nairobiToUtcIso(2026, 2, 31)).toBeNull();
    expect(nairobiToUtcIso(2026, 13, 1)).toBeNull();
  });
});

describe('parseCsv', () => {
  it('handles BOM, CRLF, quotes, escaped quotes and embedded newlines', () => {
    const rows = parseCsv('﻿a,b\r\n"x, y","he said ""hi"""\r\n"multi\nline",z\r\n\r\n');
    expect(rows.map((r) => r.cells)).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
      ['multi\nline', 'z'],
    ]);
    expect(rows[2]?.line).toBe(3);
  });

  it('never throws on garbage', () => {
    expect(parseCsvResult('"unterminated,quote\n\n,,,').ok).toBe(false);
    expect(parseCsv('')).toEqual([]);
  });
});

describe('parseMpesaStatementCsv', () => {
  const res = parseMpesaStatementCsv(MPESA_STATEMENT_CSV, opts);
  const out = res.ok ? res.value : { lines: [], rowErrors: [], skipped: -1 };

  it('finds the header after metadata and keeps only completed paid-in rows', () => {
    expect(res.ok).toBe(true);
    expect(out.lines.map((l) => l.externalRef)).toEqual([
      'QFT4AB12CD',
      'QFT4AB12CE',
      'QFT4AB12CF',
      'QFT4AB12CD',
      'QFT4AB12CJ',
      'QFT4AB12CK',
      'QFT4AB12CQ',
    ]);
    expect(out.skipped).toBe(4); // failed, withdrawal, charge, zero paid-in
  });

  it('converts amounts and Nairobi times to UTC', () => {
    const first = out.lines[0]!;
    expect(first.amount).toBe(1_200_000n);
    expect(first.currency).toBe('KES');
    expect(first.paidAt).toBe('2026-03-11T06:14:02.000Z');
    expect(out.lines[5]?.paidAt).toBe('2026-03-12T12:45:00.000Z'); // dd-mm-yyyy variant
    expect(out.lines[6]?.amount).toBe(125_050n);
  });

  it('extracts payer, hashed phone and normalised account refs', () => {
    const [a, b, c, , d] = out.lines;
    expect(a?.payerName).toBe('JOHN DOE');
    expect(a?.payerPhoneHash).toBe(hashPhone('+254700000001'));
    expect(a?.accountRef).toBe('B-12');
    expect(b?.accountRef).toBe('B-14');
    expect(c?.accountRef).toBeUndefined();
    expect(d?.payerName).toBe('DOE, JANE');
    expect(d?.accountRef).toBe('RENT B12');
    expect(out.lines[6]?.payerPhoneHash).toBeUndefined(); // masked number cannot be hashed
  });

  it('never exposes a raw phone on parsed lines', () => {
    expect(JSON.stringify(out.lines.map((l) => ({ ...l, rawLine: '', amount: 0 })))).not.toMatch(
      /\+?2547\d{8}/,
    );
  });

  it('reports malformed rows instead of throwing', () => {
    expect(out.rowErrors.map((e) => e.code).sort()).toEqual(['invalid_amount', 'invalid_date']);
    expect(out.rowErrors.every((e) => e.row > 5)).toBe(true);
  });

  it('errors when the header is missing', () => {
    const r = parseMpesaStatementCsv('a,b,c\n1,2,3', opts);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe('statement_header_not_found');
    expect(parseMpesaStatementCsv('', opts).ok).toBe(false);
  });

  it('reports rows with no receipt', () => {
    const csv =
      'Receipt No.,Completion Time,Transaction Status,Paid In\n,2026-03-11 09:00:00,Completed,100.00';
    const r = parseMpesaStatementCsv(csv, opts);
    expect(r.ok && r.value.rowErrors[0]?.code).toBe('missing_receipt');
  });

  it('falls back to Details for the account reference', () => {
    const csv =
      'Receipt No.,Completion Time,Details,Transaction Status,Paid In\nAAA1111111,2026-03-11 09:00:00,Pay Bill from 254700000001 - X Acc. B-12,Completed,100.00';
    const r = parseMpesaStatementCsv(csv, opts);
    expect(r.ok && r.value.lines[0]?.accountRef).toBe('B-12');
  });
});

describe('parseBankCsv', () => {
  const res = parseBankCsv(BANK_CSV, BANK_MAPPING, opts);
  const out = res.ok ? res.value : { lines: [], rowErrors: [], skipped: -1 };

  it('imports credits only, with references and dates', () => {
    expect(out.lines.map((l) => [l.externalRef, l.amount])).toEqual([
      ['FT26070ABC12', 1_200_000n],
      ['PL26071XYZ34', 1_550_000n],
      [undefined, 800_000n],
    ]);
    expect(out.lines[0]?.paidAt).toBe('2026-03-11T09:00:00.000Z');
    expect(out.skipped).toBe(1); // debit-only charge
  });

  it('reports bad dates and amounts per row', () => {
    expect(out.rowErrors.map((e) => e.code).sort()).toEqual(['invalid_amount', 'invalid_date']);
  });

  it('supports a single signed amount column and other date formats', () => {
    const ok = parseBankCsv(
      'Date,Amt,Ref\n3/3/2026,"1,000",abc1234\n',
      { date: 'Date', amount: 'Amt', reference: 'Ref', dateFormat: 'D/M/YYYY' },
      opts,
    );
    expect(ok.ok && ok.value.lines[0]?.externalRef).toBe('ABC1234');
    expect(ok.ok && ok.value.lines[0]?.paidAt).toBe('2026-03-03T09:00:00.000Z');
  });

  it('errors on invalid mapping or missing columns', () => {
    expect(parseBankCsv(BANK_CSV, { ...BANK_MAPPING, credit: undefined as never }, opts).ok).toBe(
      false,
    );
    expect(parseBankCsv('foo,bar\n1,2', BANK_MAPPING, opts).ok).toBe(false);
  });
});

describe('parseMpesaSms', () => {
  const line = (s: string) => {
    const r = parseMpesaSms(s);
    return r.ok ? r.value.lines[0] : undefined;
  };

  it('parses the standard paybill confirmation', () => {
    const l = line(SMS_VARIANTS.paybill);
    expect(l).toMatchObject({
      externalRef: 'QFT4AB12CD',
      amount: 1_200_000n,
      accountRef: 'B-12',
      payee: 'RIVERSIDE COURT',
      paidAt: '2026-03-11T06:14:00.000Z',
    });
  });

  it('tolerates spacing, 4-digit years and lowercase', () => {
    expect(line(SMS_VARIANTS.paybillSpaced)).toMatchObject({
      amount: 1_550_000n,
      accountRef: 'B-14',
    });
    expect(line(SMS_VARIANTS.paybillLowercase)).toMatchObject({
      externalRef: 'QFT4AB12CF',
      amount: 800_000n,
      accountRef: 'B-12',
      paidAt: '2026-03-11T10:30:00.000Z',
    });
  });

  it('parses till payments (no account) and 12 AM correctly', () => {
    const t = line(SMS_VARIANTS.till);
    expect(t).toMatchObject({
      externalRef: 'QFT4AB12CG',
      payee: 'RIVERSIDE COURT SHOP',
      amount: 1_200_000n,
    });
    expect(t?.accountRef).toBeUndefined();
    expect(line(SMS_VARIANTS.tillMidnight)?.paidAt).toBe('2026-03-13T21:10:00.000Z');
  });

  it('rejects unrecognised or invalid messages without throwing', () => {
    expect(parseMpesaSms(NOT_AN_SMS).ok).toBe(false);
    expect(parseMpesaSms('').ok).toBe(false);
    const badDate = SMS_VARIANTS.paybill.replace('11/3/26', '31/2/26');
    const r = parseMpesaSms(badDate);
    expect(!r.ok && r.error.code).toBe('invalid_date');
    expect(parseMpesaSms(SMS_VARIANTS.paybill.replace('QFT4AB12CD', 'AAAAAAAAAA')).ok).toBe(false);
  });
});
