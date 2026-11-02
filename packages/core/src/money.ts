import { appError, err, ok, type AppError, type Result } from './result';

/** Money as integer minor units (KES cents). Never floats. */
export type Money = {
  readonly amountMinor: bigint;
  readonly currency: 'KES';
};

export const kes = (amountMinor: bigint): Money => ({ amountMinor, currency: 'KES' });

export const zero = (): Money => kes(0n);

export const add = (a: Money, b: Money): Money => kes(a.amountMinor + b.amountMinor);

export const subtract = (a: Money, b: Money): Money => kes(a.amountMinor - b.amountMinor);

export const isNegative = (a: Money): boolean => a.amountMinor < 0n;

const withThousands = (digits: string): string => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** Format as "KES 1,234.00" (negative: "-KES 1,234.00"). */
export const format = (m: Money): string => {
  const negative = m.amountMinor < 0n;
  const abs = negative ? -m.amountMinor : m.amountMinor;
  const major = abs / 100n;
  const minor = (abs % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}KES ${withThousands(major.toString())}.${minor}`;
};

/** Parse a decimal string such as "1234.50" into Money without floats. */
export const parse = (input: string): Result<Money, AppError> => {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(input.trim());
  if (!match) return err(appError('invalid_money', 'Invalid money amount'));
  const [, sign, major, frac = ''] = match;
  const minor = BigInt(`${major}${frac.padEnd(2, '0')}`);
  return ok(kes(sign === '-' ? -minor : minor));
};
