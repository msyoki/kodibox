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
    expect(env.DARAJA_SHORTCODE).toBeUndefined();
  });

  it('treats empty strings as unset optional vars', () => {
    expect(parseServerEnv({ ...valid, DARAJA_PASSKEY: '' }).DARAJA_PASSKEY).toBeUndefined();
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
});
