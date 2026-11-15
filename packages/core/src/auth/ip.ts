/**
 * Client IP resolution behind trusted proxies. X-Forwarded-For is attacker-controlled on the left:
 * every proxy APPENDS the address of its peer. With N trusted proxies in front of the app, the real
 * client is the Nth entry from the RIGHT; anything further left is client-supplied and ignored.
 * With 0 trusted hops no forwarded header is trusted at all (returns null).
 */
export function resolveClientIp(
  forwardedFor: string | null | undefined,
  trustedHops: number,
): string | null {
  if (!forwardedFor || !Number.isInteger(trustedHops) || trustedHops < 1) return null;
  const hops = forwardedFor.split(',').map((h) => h.trim());
  const candidate = hops[hops.length - trustedHops];
  if (!candidate) return null;
  return isPlausibleIp(candidate) ? candidate.toLowerCase() : null;
}

function isPlausibleIp(v: string): boolean {
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return v.split('.').every((o) => Number(o) <= 255);
  return /^[0-9a-fA-F:]{2,39}$/.test(v) && v.includes(':') && expandIpv6(v) !== null;
}

function expandIpv6(v: string): string[] | null {
  const parts = v.split('::');
  if (parts.length > 2) return null;
  const head = parts[0] ? parts[0].split(':') : [];
  const tail = parts.length === 2 && parts[1] ? parts[1].split(':') : [];
  if (parts.length === 1 && head.length !== 8) return null;
  const missing = 8 - head.length - tail.length;
  if (missing < 0 || (parts.length === 2 && missing < 1)) return null;
  const all = [...head, ...Array<string>(parts.length === 2 ? missing : 0).fill('0'), ...tail];
  if (all.length !== 8 || !all.every((g) => /^[0-9a-fA-F]{1,4}$/.test(g))) return null;
  return all.map((g) => g.toLowerCase().padStart(4, '0'));
}

/**
 * Rate-limit bucket for an address: IPv4 as is; IPv6 collapsed to its /64 so one host cannot
 * rotate through 2^64 addresses to dodge per-IP limits.
 */
export function ipRateLimitBucket(ip: string | null): string {
  if (!ip) return 'unknown';
  if (!ip.includes(':')) return ip;
  const g = expandIpv6(ip);
  return g ? `${g.slice(0, 4).join(':')}::/64` : 'unknown';
}

/** Header carrying the trusted client IP. Only ever set by trustedClientHeaders(); inbound values are stripped. */
export const CLIENT_IP_HEADER = 'x-kodibox-client-ip';

/**
 * Copy of `headers` with any inbound CLIENT_IP_HEADER removed and, when the trusted-proxy resolver
 * finds one, the resolved client IP set. The ONE place this header is written: used by the auth
 * route handler and by server-side session helpers, so a client can never inject its own value.
 */
export function trustedClientHeaders(headers: Headers, trustedHops: number): Headers {
  const out = new Headers(headers);
  out.delete(CLIENT_IP_HEADER);
  const ip = resolveClientIp(out.get('x-forwarded-for'), trustedHops);
  if (ip) out.set(CLIENT_IP_HEADER, ip);
  return out;
}
