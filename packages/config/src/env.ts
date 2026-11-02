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
    DARAJA_CONSUMER_KEY: optionalString,
    DARAJA_CONSUMER_SECRET: optionalString,
    DARAJA_PASSKEY: optionalString,
    DARAJA_SHORTCODE: optionalString,
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
