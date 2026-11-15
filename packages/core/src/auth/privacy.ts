/** Bump when the privacy notice text or purposes change; shown on every auth screen and at /privacy. */
export const PRIVACY_NOTICE_VERSION = '2026-11-15';
export const PRIVACY_NOTICE_PATH = '/privacy';

/**
 * Controller identity shown on /privacy. PLACEHOLDERS until the company is registered; the page
 * refuses to render in production while any value is still a placeholder (see
 * unconfiguredControllerFields), so it cannot ship unconfigured.
 */
export const CONTROLLER_NAME = '[COMPANY NAME]';
export const CONTROLLER_ADDRESS = '[REGISTERED ADDRESS]';
export const CONTACT_EMAIL = '[PRIVACY CONTACT EMAIL]';
export const ODPC_REG_NO = '[ODPC REGISTRATION NUMBER]';

export function unconfiguredControllerFields(
  fields: Record<string, string> = {
    CONTROLLER_NAME,
    CONTROLLER_ADDRESS,
    CONTACT_EMAIL,
    ODPC_REG_NO,
  },
): string[] {
  return Object.entries(fields)
    .filter(([, v]) => !v.trim() || /^\[.*\]$/.test(v.trim()))
    .map(([k]) => k);
}

/** Throws in production while any controller identity field is still a placeholder. */
export function assertControllerIdentityConfigured(
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (nodeEnv !== 'production') return;
  const missing = unconfiguredControllerFields();
  if (missing.length > 0) {
    throw new Error(`Privacy notice controller identity not configured: ${missing.join(', ')}`);
  }
}
