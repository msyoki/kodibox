import { getAuthDb } from '@kodibox/db/auth';
import { purgeExpiredAuthData } from '../maintenance';

if (process.argv[1]?.endsWith('purge-expired.ts')) {
  const db = getAuthDb();
  try {
    const r = await purgeExpiredAuthData(db);
    console.log(
      `purge:expired removed ${r.sessions} sessions and ${r.verifications} verifications`,
    );
  } finally {
    await db.close();
  }
}
