export const OTP_LENGTH = 6;

/** Keep digits only (handles paste, SMS autofill and spaces/dashes) and cap at the code length. */
export function sanitizeOtp(raw: string, length = OTP_LENGTH): string {
  return raw.replace(/\D/g, '').slice(0, length);
}
