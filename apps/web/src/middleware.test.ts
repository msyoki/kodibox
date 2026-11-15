import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';
import { isProtectedPath } from './lib/app-paths';
import { middleware } from './middleware';

const req = (path: string, cookie?: string) =>
  new NextRequest(`http://localhost:3100${path}`, cookie ? { headers: { cookie } } : undefined);

describe('auth middleware', () => {
  it('redirects (app) routes without a session cookie to /login with a safe next', () => {
    const res = middleware(req('/payments?tab=unmatched'));
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get('location')!);
    expect(loc.pathname).toBe('/login');
    expect(loc.searchParams.get('next')).toBe('/payments?tab=unmatched');
  });
  it('sends staff mobile routes to /m/login', () => {
    const loc = new URL(middleware(req('/m/manager/alerts')).headers.get('location')!);
    expect(loc.pathname).toBe('/m/login');
  });
  it('lets requests with a session cookie through, no-store', () => {
    for (const c of ['kodibox.session_token=abc', '__Host-kodibox_session=abc']) {
      const res = middleware(req('/dashboard', c));
      expect(res.headers.get('location')).toBeNull();
      expect(res.headers.get('cache-control')).toBe('no-store');
    }
  });
  it('only gates authenticated areas; public routes pass', () => {
    for (const p of [
      '/login',
      '/m/login',
      '/onboarding',
      '/privacy',
      '/api/auth/sign-in/email',
      '/',
    ])
      expect(isProtectedPath(p), p).toBe(false);
    for (const p of ['/m', '/m/tenant', '/dashboard', '/portal', '/settings/security'])
      expect(isProtectedPath(p), p).toBe(true);
    expect(middleware(req('/privacy')).headers.get('location')).toBeNull();
  });

  it('strips an inbound client-ip header from every request (public and protected)', () => {
    const spoof = {
      cookie: 'kodibox.session_token=abc',
      'x-kodibox-client-ip': '1.2.3.4',
      'x-keep': '1',
    };
    for (const path of ['/login', '/api/auth/sign-in/email', '/dashboard']) {
      const r = new NextRequest(`http://localhost:3100${path}`, { headers: spoof });
      const names = (middleware(r).headers.get('x-middleware-override-headers') ?? '').split(',');
      expect(names, path).not.toContain('x-kodibox-client-ip');
      expect(names, path).toContain('x-keep');
    }
  });
});

describe('auth middleware in production', () => {
  it('accepts only the __Host- cookie name', () => {
    vi.stubEnv('NODE_ENV', 'production');
    try {
      expect(middleware(req('/dashboard', 'kodibox.session_token=abc')).status).toBe(307);
      expect(middleware(req('/dashboard', '__Host-kodibox_session=abc')).status).toBe(200);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
