/**
 * Session cookie names, shared by the auth server (packages/auth) and the Edge middleware, which
 * can only check that a cookie is present (real validation happens server-side).
 * Production uses ONLY the `__Host-` prefixed name (Secure, Path=/, no Domain), so a cookie
 * planted from a sibling subdomain or over HTTP is ignored.
 */
export const SESSION_COOKIE_NAME_PROD = '__Host-kodibox_session';
export const SESSION_COOKIE_NAME_DEV = 'kodibox.session_token';

export function sessionCookieNames(production: boolean): readonly string[] {
  return production
    ? [SESSION_COOKIE_NAME_PROD]
    : [SESSION_COOKIE_NAME_PROD, SESSION_COOKIE_NAME_DEV];
}
