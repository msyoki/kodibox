import { CLIENT_IP_HEADER, sessionCookieNames } from '@kodibox/core';
import { NextResponse, type NextRequest } from 'next/server';
import { isProtectedPath } from './lib/app-paths';

/**
 * Runs on every request (except static assets):
 *  1. Strips any inbound client-IP header so a client can never inject one into server-side helpers
 *     (the trusted value is derived from X-Forwarded-For + TRUSTED_PROXY_HOPS in server code).
 *  2. For authenticated areas, checks that a session cookie is PRESENT (the Edge runtime cannot reach
 *     the database); every page/action re-validates with requireSession().
 * Public: /, /login*, /m/login, /onboarding, /privacy, /api/*.
 */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(CLIENT_IP_HEADER);

  if (isProtectedPath(request.nextUrl.pathname)) {
    const names = sessionCookieNames(process.env.NODE_ENV === 'production');
    if (!names.some((n) => request.cookies.has(n))) {
      const url = request.nextUrl.clone();
      const next = request.nextUrl.pathname + request.nextUrl.search;
      url.pathname = request.nextUrl.pathname.startsWith('/m') ? '/m/login' : '/login';
      url.search = '';
      if (next.startsWith('/') && !next.startsWith('//')) url.searchParams.set('next', next);
      return NextResponse.redirect(url);
    }
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'],
};
