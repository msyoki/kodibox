import postgres from 'postgres';
import { adminDatabaseUrl } from '../env';

const MIN_PASSWORD_LENGTH = 24;

/** Outside development/test, refuse placeholder (.env.example "change-me") or short passwords. */
export function assertStrongPasswords(
  passwords: { migrator: string; app: string },
  nodeEnv: string | undefined = process.env.NODE_ENV,
): void {
  if (!passwords.migrator || !passwords.app) throw new Error('role passwords are required');
  if (nodeEnv === 'development' || nodeEnv === 'test') return;
  for (const [role, pw] of Object.entries(passwords)) {
    if (/change-me/i.test(pw) || pw.length < MIN_PASSWORD_LENGTH) {
      throw new Error(
        `db:bootstrap: the ${role} password is a placeholder or shorter than ${MIN_PASSWORD_LENGTH} characters; refusing outside development/test`,
      );
    }
  }
}

/**
 * Creates/updates the two runtime roles with LOGIN + passwords and hands the database to the
 * migrator. Run once per environment by a privileged role (DATABASE_ADMIN_URL). Idempotent.
 */
export async function bootstrapRoles(
  adminUrl: string,
  passwords: { migrator: string; app: string },
): Promise<void> {
  assertStrongPasswords(passwords);
  const admin = postgres(adminUrl, { max: 1, onnotice: () => undefined });
  try {
    // Keep the ALTER ROLE ... PASSWORD statements out of the server log (max: 1 => same session).
    // log_statement is superuser-only; managed Postgres admins may not be able to set it.
    try {
      await admin.unsafe("SET log_statement = 'none'");
    } catch {
      console.warn(
        'db:bootstrap: could not SET log_statement = none (not superuser); check server logging',
      );
    }
    await admin.unsafe(`DO $b$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kodibox_migrator') THEN
        CREATE ROLE kodibox_migrator NOSUPERUSER NOBYPASSRLS;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'kodibox_app') THEN
        CREATE ROLE kodibox_app NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
      END IF;
    END $b$`);
    // format(%L / %I) quotes server-side; passwords are bound parameters, never concatenated.
    const rows = await admin<{ q: string }[]>`
      select format('ALTER ROLE kodibox_migrator WITH LOGIN NOSUPERUSER NOBYPASSRLS PASSWORD %L', ${passwords.migrator}::text) as q
      union all
      select format('ALTER ROLE kodibox_app WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS PASSWORD %L', ${passwords.app}::text)
      union all
      select format('ALTER DATABASE %I OWNER TO kodibox_migrator', current_database())
      union all
      select format('GRANT CONNECT ON DATABASE %I TO kodibox_app', current_database())`;
    for (const { q } of rows) await admin.unsafe(q);
    await admin.unsafe('ALTER SCHEMA public OWNER TO kodibox_migrator');
  } finally {
    await admin.end({ timeout: 5 });
  }
}

if (process.argv[1]?.endsWith('bootstrap.ts')) {
  await bootstrapRoles(adminDatabaseUrl(), {
    migrator: process.env.KODIBOX_MIGRATOR_PASSWORD ?? '',
    app: process.env.KODIBOX_APP_PASSWORD ?? '',
  });
  console.log('db:bootstrap complete (roles kodibox_migrator, kodibox_app)');
}
