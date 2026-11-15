import { sessions, verifications, type AuthDbClient } from '@kodibox/db/auth';
import { lt } from 'drizzle-orm';

/**
 * Retention job for credential-adjacent data (SECURITY.md section 10; periods are [LEGAL] proposals):
 * deletes expired sessions (they carry IP + user agent, purpose: security/device list, retained only
 * while valid) and expired verifications (OTP codes, email tokens, step-up marks; identifiers hold
 * phone numbers / emails). Run daily (cron or the worker once it exists). Runs as kodibox_auth.
 * Idempotent; returns counts only (no identifiers).
 */
export async function purgeExpiredAuthData(
  db: AuthDbClient,
  now: Date = new Date(),
): Promise<{ sessions: number; verifications: number }> {
  const s = await db.orm
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id });
  const v = await db.orm
    .delete(verifications)
    .where(lt(verifications.expiresAt, now))
    .returning({ id: verifications.id });
  return { sessions: s.length, verifications: v.length };
}
