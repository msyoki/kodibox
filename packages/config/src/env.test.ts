import { describe, expect, it } from 'vitest';
import { EnvValidationError, parseServerEnv } from './env';

const valid = {
  APP_URL: 'http://localhost:3000',
  DATABASE_URL: 'postgres://user:change-me@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  AUTH_SECRET: 'change-me-change-me-change-me-change-me',
  ENCRYPTION_KEK: 'change-me-kek',
};

describe('parseServerEnv', () => {
  it('parses a valid env and applies defaults', () => {
    const env = parseServerEnv(valid);
    expect(env.NODE_ENV).toBe('development');
    expect(env.AUTH_DATABASE_URL).toBeUndefined();
    expect('DARAJA_SHORTCODE' in env).toBe(false);
  });

  it('treats empty strings as unset optional vars', () => {
    expect(parseServerEnv({ ...valid, BETTER_AUTH_URL: '' }).BETTER_AUTH_URL).toBeUndefined();
  });

  it('fails fast with readable issues and no values', () => {
    try {
      parseServerEnv({ ...valid, AUTH_SECRET: 'short', REDIS_URL: undefined });
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(EnvValidationError);
      const msg = (e as Error).message;
      expect(msg).toContain('AUTH_SECRET');
      expect(msg).toContain('REDIS_URL');
      expect(msg).not.toContain('short');
    }
  });

  it('rejects an unknown NODE_ENV', () => {
    expect(() => parseServerEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(EnvValidationError);
  });

  describe('production database safety', () => {
    const prod = {
      ...valid,
      NODE_ENV: 'production',
      DATABASE_URL: 'postgres://kodibox_app:pw@db:5432/kodibox',
      AUTH_DATABASE_URL: 'postgres://kodibox_auth:pw@db:5432/kodibox',
      APP_URL: 'https://app.kodibox.example',
      AUTH_SECRET: 'Zk3v9QpL2mXr7TnB5yHc8WdF1gJs4UaE6oIq0NlRtVw=',
      ENCRYPTION_KEK: 'q8W2eR5tY7uI9oP1aS3dF6gH0jK2lZ4xC6vB8nM1qA3=',
      TRUSTED_PROXY_HOPS: '1',
    };

    it('rejects placeholder or low-entropy secrets', () => {
      expect(() =>
        parseServerEnv({ ...prod, AUTH_SECRET: 'change-me-change-me-change-me-change-me' }),
      ).toThrow(/AUTH_SECRET/);
      expect(() =>
        parseServerEnv({ ...prod, ENCRYPTION_KEK: 'change-me-kek-placeholder' }),
      ).toThrow(/ENCRYPTION_KEK/);
      expect(() =>
        parseServerEnv({ ...prod, AUTH_SECRET: 'abababababababababababababababababab' }),
      ).toThrow(/32 bytes/);
    });

    it('requires https URLs and exact https trusted origins', () => {
      expect(() => parseServerEnv({ ...prod, APP_URL: 'http://app.kodibox.example' })).toThrow(
        /https/,
      );
      expect(() => parseServerEnv({ ...prod, BETTER_AUTH_URL: 'http://x.example' })).toThrow(
        /https/,
      );
      expect(() =>
        parseServerEnv({ ...prod, AUTH_TRUSTED_ORIGINS: 'https://*.kodibox.example' }),
      ).toThrow(/exact https/);
      expect(() => parseServerEnv({ ...prod, AUTH_TRUSTED_ORIGINS: 'http://a.example' })).toThrow(
        /exact https/,
      );
      expect(() =>
        parseServerEnv({ ...prod, AUTH_TRUSTED_ORIGINS: 'https://a.example/path' }),
      ).toThrow(/exact https/);
      expect(
        parseServerEnv({ ...prod, AUTH_TRUSTED_ORIGINS: 'https://a.example, https://b.example' })
          .NODE_ENV,
      ).toBe('production');
    });

    it('requires TRUSTED_PROXY_HOPS in production', () => {
      expect(() => parseServerEnv({ ...prod, TRUSTED_PROXY_HOPS: undefined })).toThrow(
        /TRUSTED_PROXY_HOPS/,
      );
    });

    it('requires AUTH_DATABASE_URL as role kodibox_auth', () => {
      expect(() => parseServerEnv({ ...prod, AUTH_DATABASE_URL: undefined })).toThrow(
        /AUTH_DATABASE_URL/,
      );
      expect(() =>
        parseServerEnv({ ...prod, AUTH_DATABASE_URL: 'postgres://kodibox_app:pw@db/k' }),
      ).toThrow(/kodibox_auth/);
    });

    it('accepts the app role without privileged URLs', () => {
      expect(parseServerEnv(prod).NODE_ENV).toBe('production');
    });

    it('rejects migrator/admin URLs on runtime processes', () => {
      expect(() =>
        parseServerEnv({ ...prod, MIGRATION_DATABASE_URL: 'postgres://kodibox_migrator:x@db/k' }),
      ).toThrow(/MIGRATION_DATABASE_URL/);
      expect(() =>
        parseServerEnv({ ...prod, DATABASE_ADMIN_URL: 'postgres://postgres:x@db/k' }),
      ).toThrow(/DATABASE_ADMIN_URL/);
    });

    it('rejects a DATABASE_URL user other than kodibox_app', () => {
      expect(() =>
        parseServerEnv({ ...prod, DATABASE_URL: 'postgres://kodibox_migrator:x@db/k' }),
      ).toThrow(/kodibox_app/);
    });

    it('allows privileged URLs and other users outside production', () => {
      const env = parseServerEnv({
        ...valid,
        MIGRATION_DATABASE_URL: 'postgres://kodibox_migrator:x@localhost/k',
        DATABASE_ADMIN_URL: 'postgres://postgres:x@localhost/k',
      });
      expect(env.NODE_ENV).toBe('development');
    });
  });
});
