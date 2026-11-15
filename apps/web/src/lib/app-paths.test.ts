import { describe, expect, it } from 'vitest';
import { safeNext } from './app-paths';

const APP = 'http://localhost:3100';
const BS = String.fromCharCode(92);

describe('safeNext (post-login redirect target)', () => {
  it('accepts known same-origin app paths and keeps the query', () => {
    expect(safeNext('/dashboard', APP)).toBe('/dashboard');
    expect(safeNext('/payments?tab=unmatched', APP)).toBe('/payments?tab=unmatched');
    expect(safeNext('/m/tenant/pay', APP)).toBe('/m/tenant/pay');
  });
  it('rejects open-redirect payloads', () => {
    for (const bad of [
      `/${BS}evil.com`,
      '/%5Cevil.com',
      '/%5cevil.com',
      '//evil.com',
      'https://evil.com',
      'http://localhost:3100.evil.com/dashboard',
      '/dashboard\r\nSet-Cookie: x=1',
      '/dash\u0000board',
      'javascript:alert(1)',
      `/${BS}/evil.com`,
      '',
    ]) {
      expect(safeNext(bad, APP), JSON.stringify(bad)).toBeUndefined();
    }
  });
  it('rejects same-origin paths outside the app areas and non-strings', () => {
    expect(safeNext('/api/auth/sign-out', APP)).toBeUndefined();
    expect(safeNext('/login', APP)).toBeUndefined();
    expect(safeNext('/m/login', APP)).toBeUndefined();
    expect(safeNext(undefined, APP)).toBeUndefined();
    expect(safeNext('/' + 'a'.repeat(600), APP)).toBeUndefined();
  });
});
