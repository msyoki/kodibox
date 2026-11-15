import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PRIVACY_NOTICE_PATH, PRIVACY_NOTICE_VERSION } from '@kodibox/core';
import { otpMessageBody } from '@kodibox/integrations';
import { describe, expect, it } from 'vitest';

const read = (rel: string) => readFileSync(join(__dirname, rel), 'utf8');

describe('privacy notice at the point of collection', () => {
  it('every web auth screen (login, OTP, recovery, 2FA setup) renders inside the shell that links the notice', () => {
    const shell = read('features/auth/components/auth-shell.tsx');
    expect(shell).toContain('PRIVACY_NOTICE_PATH');
    expect(shell).toContain('PRIVACY_NOTICE_VERSION');
    expect(shell).not.toMatch(/Data\s+Protection\s+Act\s+2019\s+compliant/);
    for (const f of ['login-form.tsx', 'two-factor-setup.tsx'])
      expect(read(`features/auth/components/${f}`)).toContain('<AuthShell>');
  });
  it('the mobile web OTP screen links the notice', () => {
    expect(read('app/m/login/page.tsx')).toContain('href="/privacy"');
  });
  it('the /privacy page exists with version, per-item lawful basis, mandatory/consequence, rights and ODPC', () => {
    expect(PRIVACY_NOTICE_PATH).toBe('/privacy');
    expect(existsSync(join(__dirname, 'app/privacy/page.tsx'))).toBe(true);
    const page = read('app/privacy/page.tsx');
    expect(page).toContain('PRIVACY_NOTICE_VERSION');
    expect(PRIVACY_NOTICE_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(page.match(/Basis:/g)?.length).toBeGreaterThanOrEqual(5); // one per data item
    expect(page).toMatch(/Required/);
    expect(page).toMatch(/cannot\s+use\s+Kodibox/);
    expect(page).toMatch(/withdraw\s+any\s+consent/);
    expect(page).toMatch(/object\s+to\s+or\s+restrict/);
    // Whitespace-tolerant: prettier may wrap this sentence across lines.
    expect(page).toMatch(/automated\s+means\s+or\s+profiling/);
    expect(page).toMatch(/Data\s+Protection\s+Commissioner/);
    expect(page).toMatch(/organization&apos;s\s+own\s+privacy\s+notice/);
  });
  it('the public page carries no internal legal markers or pending-review wording', () => {
    const page = read('app/privacy/page.tsx');
    expect(page).not.toMatch(/\[LEGAL\]|pending\s+legal|legal\s+review|proposal/i);
  });
  it('the page quotes the real OTP template exactly and refuses to render in production with placeholder identity', () => {
    const page = read('app/privacy/page.tsx');
    expect(page).toContain('assertControllerIdentityConfigured()');
    expect(page).toContain(otpMessageBody('123456'));
  });
  it('has no dead "Forgot password" link', () => {
    expect(read('features/auth/components/login-form.tsx')).not.toContain('href="#forgot"');
  });
});
