import { describe, expect, it } from 'vitest';
import { assertStrongPasswords } from '../scripts/bootstrap';
import { seed } from '../scripts/seed';

const strong = { migrator: 'k3Jx9-Lm2Qv8-Zt5Rw1-Yp7Nb4', app: 'a9Wd2-Hs6Ge3-Uf8Cx1-Vq5Tz0' };

describe('bootstrap password guard', () => {
  it('accepts strong passwords anywhere', () => {
    expect(() => assertStrongPasswords(strong, 'production')).not.toThrow();
  });

  it('refuses placeholder or short passwords outside development/test', () => {
    expect(() =>
      assertStrongPasswords({ ...strong, app: 'change-me-app-local-only-xx' }, 'production'),
    ).toThrow(/refusing/);
    expect(() => assertStrongPasswords({ ...strong, migrator: 'short-pw' }, 'staging')).toThrow(
      /refusing/,
    );
  });

  it('allows weak passwords in development and test', () => {
    const weak = { migrator: 'change-me', app: 'x' };
    expect(() => assertStrongPasswords(weak, 'development')).not.toThrow();
    expect(() => assertStrongPasswords(weak, 'test')).not.toThrow();
  });
});

describe('seed guard', () => {
  it('refuses to run in production before touching the database', async () => {
    await expect(
      seed(
        { app: 'postgres://x:x@127.0.0.1:1/n', migrator: 'postgres://x:x@127.0.0.1:1/n' },
        { NODE_ENV: 'production', ALLOW_DB_SEED: '1' },
      ),
    ).rejects.toThrow(/production/);
  });

  it('requires an explicit ALLOW_DB_SEED=1 opt-in', async () => {
    const urls = { app: 'postgres://x:x@127.0.0.1:1/n', migrator: 'postgres://x:x@127.0.0.1:1/n' };
    await expect(seed(urls, { NODE_ENV: 'development' })).rejects.toThrow(/ALLOW_DB_SEED=1/);
    await expect(seed(urls, { NODE_ENV: 'test', ALLOW_DB_SEED: 'true' })).rejects.toThrow(
      /ALLOW_DB_SEED=1/,
    );
  });
});
