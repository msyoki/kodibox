import { describe, expect, it } from 'vitest';
import { isKenyanE164, maskPhone, toKenyanE164 } from './phone';

describe('phone helpers', () => {
  it('validates Kenyan E.164 numbers', () => {
    expect(isKenyanE164('+254700000001')).toBe(true);
    expect(isKenyanE164('+254100000001')).toBe(true);
    expect(isKenyanE164('0700000001')).toBe(false);
    expect(isKenyanE164('+25470000000')).toBe(false);
  });

  it('normalises local formats to E.164', () => {
    expect(toKenyanE164('0700 000 001')).toBe('+254700000001');
    expect(toKenyanE164('254700000001')).toBe('+254700000001');
    expect(toKenyanE164('+254700000001')).toBe('+254700000001');
    expect(toKenyanE164('12345')).toBeNull();
  });

  it('masks the middle digits', () => {
    expect(maskPhone('+254700000001')).toBe('+2547****0001');
    expect(maskPhone('garbage')).not.toContain('garbage');
  });
});
