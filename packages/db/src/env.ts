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

/** Auth server only: role kodibox_auth (credential tables). Never the app-role URL. */
export function authDatabaseUrl(source: Record<string, string | undefined> = process.env): string {
  if (!source.AUTH_DATABASE_URL)
    throw new Error('AUTH_DATABASE_URL is not set (role kodibox_auth)');
  return url.parse(source.AUTH_DATABASE_URL);
}
