import { z } from 'zod';

const url = z.url({ protocol: /^postgres(ql)?$/ });

/** Runtime: only the app-role URL. Never read MIGRATION_DATABASE_URL at runtime. */
export function appDatabaseUrl(source: Record<string, string | undefined> = process.env): string {
  return url.parse(source.DATABASE_URL);
}

/** Migrations: connect as kodibox_migrator. */
export function migrationDatabaseUrl(
  source: Record<string, string | undefined> = process.env,
): string {
  return url.parse(source.MIGRATION_DATABASE_URL);
}

/** Bootstrap only: a privileged role able to CREATE ROLE (local dev superuser / DBA). */
export function adminDatabaseUrl(source: Record<string, string | undefined> = process.env): string {
  return url.parse(source.DATABASE_ADMIN_URL);
}
