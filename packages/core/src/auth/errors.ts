/**
 * Enumeration-safe responses (SECURITY.md 5.7). Whatever Better Auth says on a failed
 * credential/OTP/sign-up call, the client only ever sees one of these, so "no such account",
 * "wrong password", "wrong code", "already registered" and "not allowed to use OTP" are
 * indistinguishable by body. Status: 429 for rate limits, 400 for malformed input, else 401.
 */
export const GENERIC_AUTH_ERROR = {
  code: 'INVALID_CREDENTIALS',
  message: 'Invalid credentials or code. Check your details and try again.',
} as const;
export const RATE_LIMITED_ERROR = {
  code: 'RATE_LIMITED',
  message: 'Too many attempts. Please wait a while and try again.',
} as const;
export const INVALID_INPUT_ERROR = {
  code: 'INVALID_INPUT',
  message: 'Check the details you entered and try again.',
} as const;

const SENSITIVE_PREFIXES = [
  '/sign-in/',
  '/phone-number/',
  '/sign-up/',
  '/request-password-reset',
  '/reset-password',
  '/two-factor/verify',
];

/** Paths whose failures must be generic. */
export function isEnumerationSensitivePath(path: string): boolean {
  return SENSITIVE_PREFIXES.some((p) => path.startsWith(p));
}

export interface SanitizedAuthError {
  status: number;
  body: { code: string; message: string };
}

/** Returns a replacement for a non-2xx auth response on a sensitive path, or null to pass through. */
export function sanitizeAuthError(path: string, status: number): SanitizedAuthError | null {
  if (status < 400 || !isEnumerationSensitivePath(path)) return null;
  if (status === 429) return { status: 429, body: { ...RATE_LIMITED_ERROR } };
  return { status: 401, body: { ...GENERIC_AUTH_ERROR } };
}
