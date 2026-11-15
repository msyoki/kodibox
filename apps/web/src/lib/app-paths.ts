/** Authenticated areas of the web app (shared by the Edge middleware and the post-login redirect check). */
export const APP_PATH_PREFIXES = [
  '/dashboard',
  '/invoices',
  '/landlords',
  '/maintenance',
  '/messages',
  '/move-outs',
  '/payments',
  '/properties',
  '/reports',
  '/settings',
  '/tenants',
  '/tickets',
  '/utilities',
  '/portal',
  '/m',
] as const;

const underPrefix = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

/** True for routes that require a session. /m/login is public. */
export function isProtectedPath(pathname: string): boolean {
  if (underPrefix(pathname, '/m/login')) return false;
  return APP_PATH_PREFIXES.some((p) => underPrefix(pathname, p));
}

const BACKSLASH = String.fromCharCode(92);
const hasControlChars = (v: string) =>
  [...v].some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127);

/**
 * Validates a post-login `next` target. Returns a same-origin app path or undefined. Rejects
 * backslashes (browsers treat a slash followed by a backslash as protocol-relative), encoded
 * backslashes, control characters, protocol-relative and absolute URLs, and anything outside the
 * known app areas.
 */
export function safeNext(next: string | null | undefined, appUrl: string): string | undefined {
  if (typeof next !== 'string' || next.length === 0 || next.length > 512) return undefined;
  if (next.includes(BACKSLASH) || /%5c/i.test(next) || hasControlChars(next)) return undefined;
  if (!next.startsWith('/') || next.startsWith('//')) return undefined;
  let url: URL;
  try {
    url = new URL(next, appUrl);
  } catch {
    return undefined;
  }
  if (url.origin !== new URL(appUrl).origin) return undefined;
  if (!isProtectedPath(url.pathname)) return undefined;
  return `${url.pathname}${url.search}`;
}
