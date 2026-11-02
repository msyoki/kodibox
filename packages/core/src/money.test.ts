import { describe, expect, it } from 'vitest';
import { add, format, kes, parse, subtract, zero } from './money';

const samples = [0n, 1n, 99n, 100n, 123_400n, 99_999_999_999n, -5n, -123_456n];

describe('money', () => {
  it('formats KES with thousands separators', () => {
    expect(format(kes(123_400n))).toBe('KES 1,234.00');
    expect(format(kes(5n))).toBe('KES 0.05');
    expect(format(kes(100_000_000n))).toBe('KES 1,000,000.00');
    expect(format(kes(-123_456n))).toBe('-KES 1,234.56');
  });

  it('adds and subtracts exactly', () => {
    expect(add(kes(10n), kes(20n))).toEqual(kes(30n));
    expect(subtract(kes(10n), kes(20n))).toEqual(kes(-10n));
  });

  it('is exact where floats are not (0.1 + 0.2)', () => {
    expect(add(kes(10n), kes(20n)).amountMinor).toBe(30n);
  });

  it('property: add is commutative and associative, zero is identity', () => {
    for (const a of samples)
      for (const b of samples) {
        expect(add(kes(a), kes(b))).toEqual(add(kes(b), kes(a)));
        for (const c of samples) {
          expect(add(add(kes(a), kes(b)), kes(c))).toEqual(add(kes(a), add(kes(b), kes(c))));
        }
      }
    for (const a of samples) expect(add(kes(a), zero())).toEqual(kes(a));
  });

  it('property: subtract inverts add', () => {
    for (const a of samples)
      for (const b of samples) {
        expect(subtract(add(kes(a), kes(b)), kes(b))).toEqual(kes(a));
      }
  });

  it('property: parse(format-decimal) round trips', () => {
    for (const a of samples) {
      const abs = a < 0n ? -a : a;
      const s = `${a < 0n ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
      const r = parse(s);
      expect(r.ok && r.value).toEqual(kes(a));
    }
  });

  it('rejects invalid input', () => {
    for (const s of ['', 'abc', '1.234', '1e3', '1,000']) expect(parse(s).ok).toBe(false);
  });
});
