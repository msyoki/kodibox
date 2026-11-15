export const AUTH_ROLES = [
  'owner',
  'manager',
  'accountant',
  'caretaker',
  'tenant',
  'landlord_viewer',
] as const;
export type AuthRole = (typeof AUTH_ROLES)[number];

/** SECURITY.md 6.1: TOTP is mandatory for these roles (in ANY org the user belongs to). */
export const TWO_FACTOR_REQUIRED_ROLES: readonly AuthRole[] = ['owner', 'manager', 'accountant'];

export function requiresTwoFactor(roles: readonly string[]): boolean {
  return roles.some((r) => (TWO_FACTOR_REQUIRED_ROLES as readonly string[]).includes(r));
}

/**
 * SMS-OTP sign-in is a low-privilege factor (SECURITY.md 5.x): never allowed for a user holding a
 * role that needs TOTP, or who has enrolled TOTP (otherwise OTP would bypass the second factor).
 */
export function canSignInWithOtp(roles: readonly string[], twoFactorEnabled: boolean): boolean {
  return !requiresTwoFactor(roles) && !twoFactorEnabled;
}
