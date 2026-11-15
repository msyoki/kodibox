import { describe, expect, it } from 'vitest';
import { sanitizeOtp } from './otp';

describe('sanitizeOtp', () => {
  it('keeps digits only', () => {
    expect(sanitizeOtp('12a3-4 5')).toBe('12345');
  });
  it('caps at 6 digits (pasted or autofilled codes)', () => {
    expect(sanitizeOtp('1234567890')).toBe('123456');
    expect(sanitizeOtp('123 456')).toBe('123456');
  });
  it('returns an empty string for non-digits', () => {
    expect(sanitizeOtp('abc')).toBe('');
  });
});
