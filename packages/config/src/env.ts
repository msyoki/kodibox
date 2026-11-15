import { z } from 'zod';

const optionalString = z.string().min(1).optional();

export const serverEnvSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    APP_URL: z.string().url(),
    // Runtime connection: role kodibox_app (no BYPASSRLS, not owner).
    DATABASE_URL: z.string().url(),
    // Migrations/CI only (role kodibox_migrator). Must NOT be set on runtime web/worker services.
    MIGRATION_DATABASE_URL: z.string().url().optional(),
    // db:bootstrap only (privileged). Must NOT be set on runtime services in production.
    DATABASE_ADMIN_URL: z.string().url().optional(),
    REDIS_URL: z.string().url(),
    AUTH_SECRET: z.string().min(32, 'AUTH_SECRET must be at least 32 characters'),
    // Placeholder until E-0x envelope encryption lands: base64 32-byte key-encryption key.
    ENCRYPTION_KEK: z.string().min(1),
    // Public base URL of the auth endpoints (Better Auth). Defaults to APP_URL.
    BETTER_AUTH_URL: z.string().url().optional(),
    // Extra trusted origins (comma-separated), e.g. a staging alias. APP_URL is always trusted.
    AUTH_TRUSTED_ORIGINS: optionalString,
    // Auth server connection: role kodibox_auth (credential tables). Required in production.
    AUTH_DATABASE_URL: z.string().url().optional(),
    // Opt-in: HaveIBeenPwned k-anonymity check at sign-up/password change (outbound call). Default on in production.
    // Number of trusted reverse proxies in front of the app (right-most-untrusted X-Forwarded-For hop). 0 = trust no forwarded header. Required in production.
    TRUSTED_PROXY_HOPS: z.coerce.number().int().min(0).max(5).optional(),
    // Opt-in: allow public /sign-up/email (off until the onboarding flow exists).
    AUTH_PUBLIC_SIGNUP: z.enum(['0', '1']).optional(),
    // Staging-only override: run auth with plaintext phone/email at rest (E-06 encryption is a production deploy blocker).
    AUTH_ALLOW_PLAINTEXT_PII: z.enum(['0', '1']).optional(),
    AUTH_BREACHED_PASSWORD_CHECK: z.enum(['0', '1']).optional(),
    AT_USERNAME: optionalString,
    AT_API_KEY: optionalString,
    AT_SENDER_ID: optionalString,
  })
  // This schema validates RUNTIME processes (web, worker). Migration/bootstrap scripts read their
  // own URLs and never call parseServerEnv. See packages/db/README.md for the env-per-process table.
  .superRefine((env, ctx) => {
    if (env.NODE_ENV !== 'production') return;
    for (const key of ['MIGRATION_DATABASE_URL', 'DATABASE_ADMIN_URL'] as const) {
      if (env[key] !== undefined) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must not be set on runtime processes in production`,
        });
      }
    }
    for (const key of ['AUTH_SECRET', 'ENCRYPTION_KEK'] as const) {
      const v = env[key];
      if (/change-?me|placeholder|example/i.test(v)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} looks like a placeholder; generate a real secret`,
        });
      } else if (!hasEnoughEntropy(v)) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must be a random secret of at least 32 bytes (e.g. openssl rand -base64 48)`,
        });
      }
    }
    for (const key of ['APP_URL', 'BETTER_AUTH_URL'] as const) {
      const v = env[key];
      if (v !== undefined && !v.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} must be https in production`,
        });
      }
    }
    for (const o of (env.AUTH_TRUSTED_ORIGINS ?? '')
      .split(',')
      .map((x) => x.trim())
      .filter(Boolean)) {
      let ok = false;
      try {
        const u = new URL(o);
        ok = u.protocol === 'https:' && !o.includes('*') && u.origin === o.replace(/[/]$/, '');
      } catch {
        ok = false;
      }
      if (!ok) {
        ctx.addIssue({
          code: 'custom',
          path: ['AUTH_TRUSTED_ORIGINS'],
          message: 'AUTH_TRUSTED_ORIGINS must be exact https origins (no wildcards, no paths)',
        });
      }
    }
    if (env.TRUSTED_PROXY_HOPS === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['TRUSTED_PROXY_HOPS'],
        message: 'TRUSTED_PROXY_HOPS must be set in production (number of trusted proxies)',
      });
    }
    if (!env.AUTH_DATABASE_URL) {
      ctx.addIssue({
        code: 'custom',
        path: ['AUTH_DATABASE_URL'],
        message: 'AUTH_DATABASE_URL is required in production (role kodibox_auth)',
      });
    } else {
      let authUser = '';
      try {
        authUser = decodeURIComponent(new URL(env.AUTH_DATABASE_URL).username);
      } catch {
        // malformed URL is reported by the field validator
      }
      if (authUser !== 'kodibox_auth') {
        ctx.addIssue({
          code: 'custom',
          path: ['AUTH_DATABASE_URL'],
          message: 'AUTH_DATABASE_URL must connect as role kodibox_auth in production',
        });
      }
    }
    let user = '';
    try {
      user = decodeURIComponent(new URL(env.DATABASE_URL).username);
    } catch {
      // malformed URL is reported by the field validator
    }
    if (user !== 'kodibox_app') {
      ctx.addIssue({
        code: 'custom',
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL must connect as role kodibox_app in production',
      });
    }
  });

/** Heuristic: at least 32 characters and 16 distinct characters (random base64/hex of 32+ bytes passes; repeated words fail). */
function hasEnoughEntropy(v: string): boolean {
  return v.length >= 32 && new Set(v).size >= 16;
}

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export class EnvValidationError extends Error {
  constructor(public readonly issues: readonly string[]) {
    super(`Invalid environment variables:\n${issues.map((i) => `  - ${i}`).join('\n')}`);
    this.name = 'EnvValidationError';
  }
}

/** Parses env, failing fast with a readable message. Never echoes values. */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  // Treat empty strings (common in .env files) as unset.
  const cleaned = Object.fromEntries(Object.entries(source).filter(([, v]) => v !== ''));
  const result = serverEnvSchema.safeParse(cleaned);
  if (!result.success) {
    throw new EnvValidationError(
      result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`),
    );
  }
  return result.data;
}

let cached: ServerEnv | undefined;

/** Lazily validated process env. Throws on first access if invalid. */
export const serverEnv: ServerEnv = new Proxy({} as ServerEnv, {
  get(_t, prop: string) {
    cached ??= parseServerEnv(process.env);
    return cached[prop as keyof ServerEnv];
  },
  has(_t, prop: string) {
    cached ??= parseServerEnv(process.env);
    return prop in cached;
  },
  ownKeys() {
    cached ??= parseServerEnv(process.env);
    return Reflect.ownKeys(cached);
  },
  getOwnPropertyDescriptor(_t, prop: string) {
    cached ??= parseServerEnv(process.env);
    return Reflect.getOwnPropertyDescriptor(cached, prop);
  },
});
