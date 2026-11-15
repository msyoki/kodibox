import { createHmac } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { MemoryRateLimitStore } from '@kodibox/core';
import { createAuthDbClient, type AuthDbClient } from '@kodibox/db/auth';
import { bootstrapRoles, createDbClient, runMigrations, type DbClient } from '@kodibox/db/testing';
import { MemoryEmailSink, MemoryOtpSink, UnconfiguredSender } from '@kodibox/integrations';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import {
  createAuth,
  handleAuthRequest,
  purgeExpiredAuthData,
  stepUpWithPassword,
  hashPassword,
  isSteppedUp,
  listDevices,
  markSteppedUp,
  resolveSession,
  revokeAllOtherDevices,
  revokeDevice,
  type KodiboxAuth,
} from '../index';

function dockerAvailable(): boolean {
  try {
    return spawnSync('docker', ['info'], { stdio: 'ignore', timeout: 60_000 }).status === 0;
  } catch {
    return false;
  }
}
const hasDocker = dockerAvailable();
const BASE = 'http://localhost:3100';
// Throwaway credentials for ephemeral containers / fixtures only.
const PW = 'correct-horse-battery-1';
const SECRET = 'test-secret-test-secret-test-secret-0123456789';

function totp(base32Secret: string, now = Date.now()): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const c of base32Secret.replace(/=+$/, ''))
    bits += alphabet.indexOf(c).toString(2).padStart(5, '0');
  const bytes = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(now / 30_000)));
  const h = createHmac('sha1', bytes).update(counter).digest();
  const o = h[h.length - 1]! & 0xf;
  const n = ((h[o]! & 0x7f) << 24) | (h[o + 1]! << 16) | (h[o + 2]! << 8) | h[o + 3]!;
  return String(n % 1_000_000).padStart(6, '0');
}

class Jar {
  private cookies = new Map<string, string>();
  absorb(res: Response) {
    for (const c of res.headers.getSetCookie()) {
      const [pair = ''] = c.split(';');
      const i = pair.indexOf('=');
      const name = pair.slice(0, i);
      const value = pair.slice(i + 1);
      if (/max-age=0/i.test(c) || value === '') this.cookies.delete(name);
      else this.cookies.set(name, value);
    }
  }
  header(): string {
    return [...this.cookies].map(([k, v]) => `${k}=${v}`).join('; ');
  }
  headers(extra: Record<string, string> = {}): Headers {
    return new Headers({
      origin: BASE,
      'content-type': 'application/json',
      cookie: this.header(),
      ...extra,
    });
  }
}

describe.skipIf(!hasDocker)('auth integration (Testcontainers Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let authDb: AuthDbClient;
  let admin: DbClient;
  let appDb: DbClient;
  let auth: KodiboxAuth;
  let otp: MemoryOtpSink;
  let mail: MemoryEmailSink;
  let ipCounter = 0;

  const post = (path: string, body: unknown, jar = new Jar(), ip?: string) =>
    handleAuthRequest(
      auth,
      new Request(`${BASE}/api/auth${path}`, {
        method: 'POST',
        headers: jar.headers({
          'x-forwarded-for': ip ?? `10.0.${Math.floor(++ipCounter / 250)}.${ipCounter % 250}`,
        }),
        body: JSON.stringify(body),
      }),
      { trustedProxyHops: 1, allowPublicSignUp: true },
    ).then((r) => {
      jar.absorb(r);
      return r;
    });

  const passwordHash = hashPassword(PW);
  async function seedUser(opts: {
    email: string;
    roles?: string[];
    phone?: string;
    org: string;
    password?: boolean;
  }) {
    const [user] = await admin.sql<{ id: string }[]>`
      insert into users (email, display_name, email_verified, phone_number, phone_number_verified)
      values (${opts.email}, 'Test User', true, ${opts.phone ?? null}, false) returning id`;
    const id = user!.id;
    if (opts.password !== false) {
      await admin.sql`insert into accounts (user_id, account_id, provider_id, password)
        values (${id}, ${id}, 'credential', ${await passwordHash})`;
    }
    for (const role of opts.roles ?? []) {
      await admin.sql`insert into memberships (organization_id, user_id, role, status) values (${opts.org}, ${id}, ${role}, 'active')`;
    }
    return { id };
  }

  let org: string;
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    const adminUrl = container.getConnectionUri();
    await bootstrapRoles(adminUrl, {
      migrator: 'tc-migrator-pw',
      app: 'tc-app-pw',
      auth: 'tc-auth-pw',
    });
    const u = (user: string, pw: string) =>
      `postgres://${user}:${pw}@${container.getHost()}:${container.getPort()}/${container.getDatabase()}`;
    await runMigrations(u('kodibox_migrator', 'tc-migrator-pw'));
    admin = createDbClient(adminUrl, { max: 2 });
    appDb = createDbClient(u('kodibox_app', 'tc-app-pw'), { max: 1 });
    authDb = createAuthDbClient(u('kodibox_auth', 'tc-auth-pw'), { max: 4 });
    otp = new MemoryOtpSink({ nodeEnv: 'test' });
    mail = new MemoryEmailSink({ nodeEnv: 'test' });
    auth = createAuth({
      db: authDb,
      secret: SECRET,
      baseURL: BASE,
      otpSender: otp,
      emailSender: mail,
      rateLimitStore: new MemoryRateLimitStore(),
      secureCookies: false,
      breachedPasswordCheck: false,
    });
    const [o] = await admin.sql<
      { id: string }[]
    >`insert into organizations (name) values ('Org A') returning id`;
    org = o!.id;
  }, 180_000);

  afterAll(async () => {
    await Promise.all([authDb?.close(), admin?.close(), appDb?.close()]);
    await container?.stop();
  });

  it('sign-up creates the single users row, requires email verification, then signs in', async () => {
    const res = await post('/sign-up/email', {
      email: 'Wanjiru@Example.test',
      password: PW,
      name: 'Wanjiru',
    });
    expect(res.status).toBe(200);
    const [row] =
      await admin.sql`select email, display_name, email_verified from users where email = 'wanjiru@example.test'`;
    expect(row).toMatchObject({ display_name: 'Wanjiru', email_verified: false });
    // password is argon2id and lives only in accounts
    const [acct] =
      await admin.sql`select password from accounts a join users u on u.id = a.user_id where u.email = 'wanjiru@example.test'`;
    expect(acct!.password).toMatch(/^\$argon2id\$/);

    // unverified: sign-in refused, generic body
    const early = await post('/sign-in/email', { email: 'wanjiru@example.test', password: PW });
    expect(early.status).toBe(401);
    expect(await early.json()).toMatchObject({ code: 'INVALID_CREDENTIALS' });

    const link = mail.sent.find((m) => m.kind === 'verify_email')!.link;
    const v = await auth.handler(new Request(link));
    expect(v.status).toBeLessThan(400);

    const jar = new Jar();
    const ok = await post('/sign-in/email', { email: 'wanjiru@example.test', password: PW }, jar);
    expect(ok.status).toBe(200);
    const cookie = jar.header();
    expect(cookie).toContain('kodibox.session_token=');
    const setCookie = ok.headers.getSetCookie().join('\n');
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/SameSite=Lax/i);
    // signed in but belongs to no organization yet: not an app session
    expect((await resolveSession(auth, authDb, jar.headers())).status).toBe('no_membership');
  });

  it('is enumeration-safe: unknown email, wrong password and duplicate sign-up look alike', async () => {
    await seedUser({ email: 'known@example.test', org });
    const wrong = await post('/sign-in/email', {
      email: 'known@example.test',
      password: 'wrong-password-123',
    });
    const unknown = await post('/sign-in/email', {
      email: 'nobody@example.test',
      password: 'wrong-password-123',
    });
    expect(wrong.status).toBe(unknown.status);
    expect(await wrong.json()).toEqual(await unknown.json());

    const fresh = await post('/sign-up/email', {
      email: 'fresh@example.test',
      password: PW,
      name: 'F',
    });
    const dup = await post('/sign-up/email', {
      email: 'known@example.test',
      password: PW,
      name: 'F',
    });
    expect(dup.status).toBe(fresh.status);
    // the duplicate must not have touched the existing account's credentials
    const [acct] =
      await admin.sql`select count(*)::int as n from accounts a join users u on u.id = a.user_id where u.email = 'known@example.test'`;
    expect(acct!.n).toBe(1);
  });

  it('rate-limits sign-in per account, with a generic 429', async () => {
    await seedUser({ email: 'limited@example.test', org });
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++)
      statuses.push(
        (
          await post('/sign-in/email', {
            email: 'limited@example.test',
            password: 'wrong-password-123',
          })
        ).status,
      );
    expect(statuses.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(statuses[6]).toBe(429);
    // even the correct password is refused while limited
    expect(
      (await post('/sign-in/email', { email: 'limited@example.test', password: PW })).status,
    ).toBe(429);
    const [a] =
      await admin.sql`select count(*)::int as n from audit_events where action = 'auth.rate_limited' and organization_id is null`;
    expect(a!.n).toBeGreaterThanOrEqual(1);
  });

  it('forces TOTP for an owner: gate blocks until enrolled, then challenge on sign-in; backup codes issued', async () => {
    const owner = await seedUser({ email: 'owner@example.test', roles: ['owner'], org });
    const jar = new Jar();
    expect(
      (await post('/sign-in/email', { email: 'owner@example.test', password: PW }, jar)).status,
    ).toBe(200);
    let r = await resolveSession(auth, authDb, jar.headers());
    expect(r.status).toBe('enrol_2fa');

    const enable = await post('/two-factor/enable', { password: PW }, jar);
    expect(enable.status).toBe(200);
    const { totpURI, backupCodes } = (await enable.json()) as {
      totpURI: string;
      backupCodes: string[];
    };
    expect(backupCodes.length).toBe(10);
    // enrolment not complete until the first code verifies
    r = await resolveSession(auth, authDb, jar.headers());
    expect(r.status).toBe('enrol_2fa');
    const secret = new URL(totpURI).searchParams.get('secret')!;
    expect((await post('/two-factor/verify-totp', { code: '000000' }, jar)).status).toBe(401);
    expect((await post('/two-factor/verify-totp', { code: totp(secret) }, jar)).status).toBe(200);
    r = await resolveSession(auth, authDb, jar.headers());
    expect(r.status).toBe('ok');

    // mandatory roles cannot disable 2FA
    expect(
      (await post('/two-factor/disable', { password: PW }, jar)).status,
    ).toBeGreaterThanOrEqual(400);
    const [u] = await admin.sql`select two_factor_enabled from users where id = ${owner.id}`;
    expect(u!.two_factor_enabled).toBe(true);

    // fresh sign-in now requires the challenge and issues no session until it passes
    const jar2 = new Jar();
    const si = await post('/sign-in/email', { email: 'owner@example.test', password: PW }, jar2);
    expect(si.status).toBe(200);
    expect(await si.json()).toMatchObject({ twoFactorRedirect: true });
    expect((await resolveSession(auth, authDb, jar2.headers())).status).toBe('unauthenticated');
    expect((await post('/two-factor/verify-totp', { code: totp(secret) }, jar2)).status).toBe(200);
    expect((await resolveSession(auth, authDb, jar2.headers())).status).toBe('ok');

    // recovery code works once
    const jar3 = new Jar();
    await post('/sign-in/email', { email: 'owner@example.test', password: PW }, jar3);
    expect(
      (await post('/two-factor/verify-backup-code', { code: backupCodes[0] }, jar3)).status,
    ).toBe(200);
    const jar4 = new Jar();
    await post('/sign-in/email', { email: 'owner@example.test', password: PW }, jar4);
    expect(
      (await post('/two-factor/verify-backup-code', { code: backupCodes[0] }, jar4)).status,
    ).toBe(401);

    expect((await post('/two-factor/generate-backup-codes', { password: PW }, jar2)).status).toBe(
      200,
    );
    const actions =
      await admin.sql`select action from audit_events where actor_user_id = ${owner.id} or entity_id = ${owner.id}`;
    const names = actions.map((a) => a.action);
    expect(names).toContain('auth.sign_in');
    expect(names).toContain('auth.2fa_enrol_started');
    expect(names).toContain('auth.2fa_enrolled');
    expect(names).toContain('auth.backup_codes_regenerated');
  });

  it('phone + SMS OTP signs in a tenant; unknown and staff numbers get no SMS and no distinguishable answer', async () => {
    await seedUser({
      email: 't1@example.test',
      roles: ['tenant'],
      phone: '+254700000101',
      org,
      password: false,
    });
    await seedUser({ email: 'm1@example.test', roles: ['manager'], phone: '+254700000102', org });

    const sentBefore = otp.sent.length;
    const jar = new Jar();
    const s1 = await post('/phone-number/send-otp', { phoneNumber: '0700 000 101' }, jar);
    const s2 = await post('/phone-number/send-otp', { phoneNumber: '+254700000199' }); // unknown
    const s3 = await post('/phone-number/send-otp', { phoneNumber: '+254700000102' }); // staff
    expect([s1.status, s2.status, s3.status]).toEqual([200, 200, 200]);
    expect(await s2.json()).toEqual(await s3.json());
    await vi.waitFor(() => expect(otp.sent.length).toBe(sentBefore + 1));
    await new Promise((r) => setTimeout(r, 150)); // nothing more arrives for unknown/staff numbers
    expect(otp.sent.length).toBe(sentBefore + 1);
    expect(otp.sent.at(-1)).toMatchObject({
      messageClass: 'otp',
      body: expect.stringMatching(/^Kodibox code [0-9]{6}[.] Valid 5 min[.] Do not share[.]$/),
    });
    const code = otp.lastCodeFor('+254700000101')!;

    expect(
      (await post('/phone-number/verify', { phoneNumber: '+254700000101', code: '000000' }, jar))
        .status,
    ).toBe(401);
    const ok = await post('/phone-number/verify', { phoneNumber: '+254700000101', code }, jar);
    expect(ok.status).toBe(200);
    expect((await resolveSession(auth, authDb, jar.headers())).status).toBe('ok');
    // code is single use
    expect(
      (await post('/phone-number/verify', { phoneNumber: '+254700000101', code }, new Jar()))
        .status,
    ).toBe(401);

    // staff can never use OTP, even with a valid code in hand
    const staffJar = new Jar();
    await post('/phone-number/send-otp', { phoneNumber: '+254700000102' }, staffJar);
    const [v] =
      await admin.sql`select value from verifications where identifier like 'phone-number-%' order by created_at desc limit 5`;
    expect(v).toBeDefined();
    const staffAttempt = await post(
      '/phone-number/verify',
      { phoneNumber: '+254700000102', code: '123456' },
      staffJar,
    );
    expect(staffAttempt.status).toBe(401);
  });

  it('caps OTP sends per phone (3/hour) and verify attempts', async () => {
    await seedUser({
      email: 't2@example.test',
      roles: ['tenant'],
      phone: '+254700000201',
      org,
      password: false,
    });
    const codes: number[] = [];
    for (let i = 0; i < 5; i++)
      codes.push((await post('/phone-number/send-otp', { phoneNumber: '+254700000201' })).status);
    expect(codes).toEqual([200, 200, 200, 429, 429]);
    const verifies: number[] = [];
    for (let i = 0; i < 7; i++)
      verifies.push(
        (await post('/phone-number/verify', { phoneNumber: '+254700000201', code: '111111' }))
          .status,
      );
    expect(verifies[verifies.length - 1]).toBe(429);
  });

  it('phone+password sign-in works for staff with a phone and is generic on failure', async () => {
    await seedUser({ email: 'm2@example.test', roles: ['caretaker'], phone: '+254700000301', org });
    expect(
      (await post('/sign-in/phone-number', { phoneNumber: '0700000301', password: PW })).status,
    ).toBe(200);
    const bad = await post('/sign-in/phone-number', {
      phoneNumber: '0700000301',
      password: 'nope-nope-nope-1',
    });
    const unknown = await post('/sign-in/phone-number', {
      phoneNumber: '0700000399',
      password: 'nope-nope-nope-1',
    });
    expect(bad.status).toBe(unknown.status);
    expect(await bad.json()).toEqual(await unknown.json());
  });

  it('sign-up cannot bind a phone number', async () => {
    await post('/sign-up/email', {
      email: 'squat@example.test',
      password: PW,
      name: 'S',
      phoneNumber: '+254700000401',
    });
    const rows = await admin.sql`select phone_number from users where email = 'squat@example.test'`;
    expect(rows[0]?.phone_number ?? null).toBeNull();
  });

  it('sessions: list devices, revoke one, sign-out revokes and audits', async () => {
    await seedUser({ email: 'dev@example.test', roles: ['tenant'], org });
    const a = new Jar();
    const b = new Jar();
    await post('/sign-in/email', { email: 'dev@example.test', password: PW }, a);
    await post('/sign-in/email', { email: 'dev@example.test', password: PW }, b);
    const devices = await listDevices(auth, a.headers());
    expect(devices).toHaveLength(2);
    expect(devices.filter((d) => d.current)).toHaveLength(1);
    expect(JSON.stringify(devices)).not.toMatch(/token/i);

    const other = devices.find((d) => !d.current)!;
    // a user cannot revoke someone else's session id
    const stranger = new Jar();
    await seedUser({ email: 'stranger@example.test', roles: ['tenant'], org });
    await post('/sign-in/email', { email: 'stranger@example.test', password: PW }, stranger);
    expect(await revokeDevice(auth, authDb, stranger.headers(), other.id)).toBe(false);
    expect(await revokeDevice(auth, authDb, a.headers(), other.id)).toBe(true);
    expect((await resolveSession(auth, authDb, b.headers())).status).toBe('unauthenticated');

    expect((await post('/sign-out', {}, a)).status).toBe(200);
    expect((await resolveSession(auth, authDb, a.headers())).status).toBe('unauthenticated');
    const [n] =
      await admin.sql`select count(*)::int as n from audit_events where action = 'auth.sign_out'`;
    expect(n!.n).toBeGreaterThanOrEqual(1);
  });

  it('idle sessions are revoked server-side (tenant: 12 h idle limit)', async () => {
    const u = await seedUser({ email: 'idle@example.test', roles: ['tenant'], org });
    const jar = new Jar();
    await post('/sign-in/email', { email: 'idle@example.test', password: PW }, jar);
    expect((await resolveSession(auth, authDb, jar.headers())).status).toBe('ok');
    const old = new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString();
    await admin.sql`update sessions set updated_at = ${old} where user_id = ${u.id}`;
    expect((await resolveSession(auth, authDb, jar.headers())).status).toBe('unauthenticated');
    const [n] = await admin.sql`select count(*)::int as n from sessions where user_id = ${u.id}`;
    expect(n!.n).toBe(0);
  });

  it('step-up freshness is per session and expires', async () => {
    const s = {
      sessionId: '019a0000-0000-7000-8000-000000000001',
      userId: (await seedUser({ email: 'su@example.test', org })).id,
    };
    expect(await isSteppedUp(authDb, s)).toBe(false);
    await markSteppedUp(authDb, s);
    expect(await isSteppedUp(authDb, s)).toBe(true);
    expect(await isSteppedUp(authDb, s, new Date(Date.now() + 11 * 60_000))).toBe(false);
    expect(
      await isSteppedUp(authDb, { ...s, sessionId: '019a0000-0000-7000-8000-000000000002' }),
    ).toBe(false);
  });

  describe('hardening', () => {
    const rawPost = (
      path: string,
      body: unknown,
      headers: Record<string, string> = {},
      opts = { trustedProxyHops: 1, allowPublicSignUp: false },
    ) =>
      handleAuthRequest(
        auth,
        new Request(`${BASE}/api/auth${path}`, {
          method: 'POST',
          headers: { origin: BASE, 'content-type': 'application/json', ...headers },
          body: JSON.stringify(body),
        }),
        opts,
      );

    it('endpoints outside the allowlist answer 404 (phone reset, OTP-2FA, update-user, closed sign-up)', async () => {
      for (const path of [
        '/phone-number/request-password-reset',
        '/phone-number/reset-password',
        '/two-factor/send-otp',
        '/two-factor/verify-otp',
        '/request-password-reset',
        '/reset-password',
        '/update-user',
        '/revoke-session',
        '/revoke-sessions',
        '/revoke-other-sessions',
        '/sign-up/email',
      ]) {
        const r = await rawPost(path, {
          phoneNumber: '+254700000101',
          email: 'x@example.test',
          password: PW,
          name: 'x',
          newPassword: PW,
          otp: '123456',
        });
        expect(r.status, path).toBe(404);
      }
    });

    it('the plugin-level disabledPaths also block the reset endpoints when the allowlist is bypassed', async () => {
      for (const path of [
        '/phone-number/request-password-reset',
        '/phone-number/reset-password',
        '/two-factor/send-otp',
        '/two-factor/verify-otp',
      ]) {
        const r = await auth.handler(
          new Request(`${BASE}/api/auth${path}`, {
            method: 'POST',
            headers: { origin: BASE, 'content-type': 'application/json' },
            body: JSON.stringify({ phoneNumber: '+254700000101' }),
          }),
        );
        expect(r.status, path).toBe(404);
      }
    });

    it('spoofed X-Forwarded-For entries and an inbound client-ip header cannot dodge the per-IP limit', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 24; i++) {
        const r = await rawPost(
          '/sign-in/email',
          { email: `spoof${i}@example.test`, password: 'whatever-whatever-1' },
          {
            'x-forwarded-for': `198.51.100.${i}, 203.0.113.77`,
            'x-kodibox-client-ip': `192.0.2.${i}`,
          },
        );
        statuses.push(r.status);
      }
      expect(statuses.slice(0, 20), JSON.stringify(statuses)).toEqual(Array(20).fill(401));
      expect(statuses.slice(20).every((s) => s === 429)).toBe(true);
    });

    it('IPv6 clients are limited per /64', async () => {
      const statuses: number[] = [];
      for (let i = 0; i < 22; i++) {
        statuses.push(
          (
            await rawPost(
              '/sign-in/email',
              { email: `v6-${i}@example.test`, password: 'whatever-whatever-1' },
              { 'x-forwarded-for': `2001:db8:aa:bb:${i.toString(16)}::1` },
            )
          ).status,
        );
      }
      expect(statuses[21]).toBe(429);
    });

    it('privileged sessions are created with <= 12 h expiry, are confined to enrolment endpoints, and die at the absolute limit', async () => {
      const u = await seedUser({ email: 'mgr@example.test', roles: ['manager'], org });
      const jar = new Jar();
      expect(
        (await post('/sign-in/email', { email: 'mgr@example.test', password: PW }, jar)).status,
      ).toBe(200);
      const [row] =
        await admin.sql`select extract(epoch from (expires_at - created_at)) as secs from sessions where user_id = ${u.id}`;
      expect(Number(row!.secs)).toBeLessThanOrEqual(12 * 3600 + 60);

      const get = (path: string) =>
        handleAuthRequest(
          auth,
          new Request(`${BASE}/api/auth${path}`, { headers: jar.headers() }),
          { trustedProxyHops: 1 },
        );
      expect((await get('/get-session')).status).toBe(200);
      expect((await get('/list-sessions')).status).toBe(403);
      expect(
        (
          await post(
            '/change-password',
            { currentPassword: PW, newPassword: 'another-long-password-9' },
            jar,
          )
        ).status,
      ).toBe(403);
      expect(
        (await post('/two-factor/generate-backup-codes', { password: PW }, jar)).status,
      ).toBeGreaterThanOrEqual(400);
      expect((await post('/two-factor/enable', { password: PW }, jar)).status).toBe(200);

      const old = new Date(Date.now() - 13 * 3600 * 1000).toISOString();
      await admin.sql`update sessions set created_at = ${old} where user_id = ${u.id}`;
      expect((await get('/get-session')).status).toBe(401);
      const [n] = await admin.sql`select count(*)::int as n from sessions where user_id = ${u.id}`;
      expect(n!.n).toBe(0);
    });

    it('revoke another device: the row is really gone; revoke others leaves only the current session', async () => {
      const u = await seedUser({ email: 'rev@example.test', roles: ['tenant'], org });
      const jars = [new Jar(), new Jar(), new Jar()];
      for (const j of jars)
        await post('/sign-in/email', { email: 'rev@example.test', password: PW }, j);
      const count = async () =>
        (await admin.sql`select count(*)::int as n from sessions where user_id = ${u.id}`)[0]!
          .n as number;
      expect(await count()).toBe(3);

      const devices = await listDevices(auth, jars[0]!.headers());
      const other = devices.find((d) => !d.current)!;
      expect(await revokeDevice(auth, authDb, jars[0]!.headers(), other.id)).toBe(true);
      expect(await count()).toBe(2);
      const gone = await admin.sql`select 1 from sessions where id = ${other.id}`;
      expect(gone).toHaveLength(0);

      expect(await revokeAllOtherDevices(auth, authDb, jars[0]!.headers())).toBe(1);
      const left = await admin.sql`select id from sessions where user_id = ${u.id}`;
      expect(left).toHaveLength(1);
      expect((await resolveSession(auth, authDb, jars[0]!.headers())).status).toBe('ok');
      const [a] =
        await admin.sql`select count(*)::int as n from audit_events where action = 'auth.sessions_revoked' and actor_user_id = ${u.id}`;
      expect(a!.n).toBeGreaterThanOrEqual(1);
    });

    it('listed sessions never expose a token or hash', async () => {
      await seedUser({ email: 'sent@example.test', roles: ['tenant'], org });
      const jar = new Jar();
      await post('/sign-in/email', { email: 'sent@example.test', password: PW }, jar);
      const res = await handleAuthRequest(
        auth,
        new Request(`${BASE}/api/auth/list-sessions`, { headers: jar.headers() }),
        { trustedProxyHops: 1 },
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as { token: string }[];
      expect(body.every((s) => s.token === '[hashed]')).toBe(true);
    });

    it('password-taking endpoints are rate-limited per user and failures are audited', async () => {
      const u = await seedUser({ email: 'pw@example.test', roles: ['tenant'], org });
      const jar = new Jar();
      await post('/sign-in/email', { email: 'pw@example.test', password: PW }, jar);
      const statuses: number[] = [];
      for (let i = 0; i < 7; i++)
        statuses.push(
          (
            await post(
              '/change-password',
              { currentPassword: 'wrong-password-123', newPassword: 'another-long-password-9' },
              jar,
            )
          ).status,
        );
      expect(statuses.slice(0, 5).every((s) => s >= 400 && s !== 429)).toBe(true);
      expect(statuses[6]).toBe(429);
      // the budget is shared across the password-gated endpoints
      expect(
        (await post('/two-factor/generate-backup-codes', { password: 'wrong-password-123' }, jar))
          .status,
      ).toBe(429);
      expect(
        (await post('/two-factor/disable', { password: 'wrong-password-123' }, jar)).status,
      ).toBe(429);
      const [f] =
        await admin.sql`select count(*)::int as n from audit_events where action = 'auth.step_up_failed' and actor_user_id = ${u.id}`;
      expect(f!.n).toBeGreaterThanOrEqual(5);
    });

    it('an expired privileged session can still sign out (cookie is cleared)', async () => {
      const u = await seedUser({ email: 'exp@example.test', roles: ['manager'], org });
      const jar = new Jar();
      await post('/sign-in/email', { email: 'exp@example.test', password: PW }, jar);
      await admin.sql`update sessions set created_at = ${new Date(Date.now() - 13 * 3600 * 1000).toISOString()} where user_id = ${u.id}`;
      const r = await post('/sign-out', {}, jar);
      expect(r.status).toBe(200);
      expect(r.headers.getSetCookie().join('\n')).toMatch(/kodibox\.session_token=;|Max-Age=0/i);
      const [n] = await admin.sql`select count(*)::int as n from sessions where user_id = ${u.id}`;
      expect(n!.n).toBe(0);
    });

    it('requests with no resolvable client IP: rejected in production mode, per-IP limit skipped (per-account kept) otherwise', async () => {
      const noIp = (opts: { trustedProxyHops: number; requireClientIp?: boolean }, email: string) =>
        handleAuthRequest(
          auth,
          new Request(`${BASE}/api/auth/sign-in/email`, {
            method: 'POST',
            headers: {
              origin: BASE,
              'content-type': 'application/json',
              'x-kodibox-client-ip': '9.9.9.9',
            },
            body: JSON.stringify({ email, password: 'whatever-whatever-1' }),
          }),
          opts,
        );
      expect(
        (await noIp({ trustedProxyHops: 1, requireClientIp: true }, 'a@example.test')).status,
      ).toBe(400);
      // 30 attempts with distinct accounts: the shared per-IP bucket is NOT applied, so none is 429
      const st: number[] = [];
      for (let i = 0; i < 25; i++)
        st.push((await noIp({ trustedProxyHops: 0 }, `noip${i}@example.test`)).status);
      expect(st.every((s) => s === 401)).toBe(true);
      // ...but the per-account limit still bites
      const same: number[] = [];
      for (let i = 0; i < 7; i++)
        same.push((await noIp({ trustedProxyHops: 0 }, 'sameacct@example.test')).status);
      expect(same[6]).toBe(429);
    });

    it('delivery failures log a coded reason and never a number', async () => {
      const dead = new UnconfiguredSender();
      const auth4 = createAuth({
        db: authDb,
        secret: SECRET,
        baseURL: BASE,
        otpSender: dead,
        emailSender: dead,
        rateLimitStore: new MemoryRateLimitStore(),
        secureCookies: false,
        breachedPasswordCheck: false,
      });
      await seedUser({
        email: 'logcode@example.test',
        roles: ['tenant'],
        phone: '+254700000601',
        org,
        password: false,
      });
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await handleAuthRequest(
        auth4,
        new Request(`${BASE}/api/auth/phone-number/send-otp`, {
          method: 'POST',
          headers: {
            origin: BASE,
            'content-type': 'application/json',
            'x-forwarded-for': '10.6.1.1',
          },
          body: JSON.stringify({ phoneNumber: '+254700000601' }),
        }),
        { trustedProxyHops: 1 },
      );
      await vi.waitFor(() => expect(spy).toHaveBeenCalled());
      const lines = spy.mock.calls.map((c) => String(c[0]));
      expect(lines).toContain('ALERT auth message delivery failed code=NO_PROVIDER');
      expect(lines.join('\n')).not.toMatch(/\+?2547\d{8}/);
      spy.mockRestore();
    });

    it('delivery failures and provider outages never change the response (no enumeration oracle)', async () => {
      const dead = new UnconfiguredSender();
      const auth2 = createAuth({
        db: authDb,
        secret: SECRET,
        baseURL: BASE,
        otpSender: dead,
        emailSender: dead,
        rateLimitStore: new MemoryRateLimitStore(),
        secureCookies: false,
        breachedPasswordCheck: false,
      });
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      await seedUser({
        email: 'oracle@example.test',
        roles: ['tenant'],
        phone: '+254700000501',
        org,
        password: false,
      });
      const send = (phone: string) =>
        handleAuthRequest(
          auth2,
          new Request(`${BASE}/api/auth/phone-number/send-otp`, {
            method: 'POST',
            headers: {
              origin: BASE,
              'content-type': 'application/json',
              'x-forwarded-for': `10.9.${++ipCounter % 250}.1`,
            },
            body: JSON.stringify({ phoneNumber: phone }),
          }),
          { trustedProxyHops: 1 },
        );
      const known = await send('+254700000501');
      const unknown = await send('+254700000598');
      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(await known.json()).toEqual(await unknown.json());
      const signup = await handleAuthRequest(
        auth2,
        new Request(`${BASE}/api/auth/sign-up/email`, {
          method: 'POST',
          headers: {
            origin: BASE,
            'content-type': 'application/json',
            'x-forwarded-for': '10.8.1.1',
          },
          body: JSON.stringify({ email: 'deadmail@example.test', password: PW, name: 'D' }),
        }),
        { trustedProxyHops: 1, allowPublicSignUp: true },
      );
      expect(signup.status).toBe(200);
      await new Promise((r) => setTimeout(r, 100));
      spy.mockRestore();
    });

    it('session tokens are hashed at rest while cookies keep working', async () => {
      const u = await seedUser({ email: 'hash@example.test', roles: ['tenant'], org });
      const jar = new Jar();
      await post('/sign-in/email', { email: 'hash@example.test', password: PW }, jar);
      const [row] = await admin.sql`select token from sessions where user_id = ${u.id}`;
      expect(row!.token).toMatch(/^[0-9a-f]{64}$/);
      expect(jar.header()).not.toContain(row!.token);
      expect((await resolveSession(auth, authDb, jar.headers())).status).toBe('ok');
      expect((await post('/sign-out', {}, jar)).status).toBe(200);
      expect((await resolveSession(auth, authDb, jar.headers())).status).toBe('unauthenticated');
    });

    it('audits password change (and revokes other sessions even when not asked), session revokes, step-up, update-user', async () => {
      const u = await seedUser({ email: 'audit@example.test', roles: ['tenant'], org });
      const a = new Jar();
      const b = new Jar();
      await post('/sign-in/email', { email: 'audit@example.test', password: PW }, a);
      await post('/sign-in/email', { email: 'audit@example.test', password: PW }, b);
      const cp = await post(
        '/change-password',
        { currentPassword: PW, newPassword: 'another-long-password-9', revokeOtherSessions: false },
        a,
      );
      expect(cp.status).toBe(200);
      expect((await resolveSession(auth, authDb, b.headers())).status).toBe('unauthenticated');

      const c = new Jar();
      await post(
        '/sign-in/email',
        { email: 'audit@example.test', password: 'another-long-password-9' },
        c,
      );
      expect(await revokeAllOtherDevices(auth, authDb, a.headers())).toBe(1);

      const upd = await auth.handler(
        new Request(`${BASE}/api/auth/update-user`, {
          method: 'POST',
          headers: a.headers(),
          body: JSON.stringify({ name: 'Renamed' }),
        }),
      );
      expect(upd.status).toBe(200);

      const store = new MemoryRateLimitStore();
      const bad: boolean[] = [];
      for (let i = 0; i < 7; i++)
        bad.push(await stepUpWithPassword(auth, authDb, a.headers(), 'not-the-password-1', store));
      expect(bad.every((x) => x === false)).toBe(true);
      expect(
        await stepUpWithPassword(auth, authDb, a.headers(), 'another-long-password-9', store),
      ).toBe(false); // limited even with the right password
      expect(
        await stepUpWithPassword(
          auth,
          authDb,
          a.headers(),
          'another-long-password-9',
          new MemoryRateLimitStore(),
        ),
      ).toBe(true);

      const names = (
        await admin.sql`select action from audit_events where actor_user_id = ${u.id}`
      ).map((r) => r.action as string);
      for (const expected of [
        'auth.password_changed',
        'auth.sessions_revoked',
        'auth.user_updated',
        'auth.step_up_failed',
        'auth.step_up',
        'auth.rate_limited',
      ])
        expect(names, expected).toContain(expected);
    });

    it('audits device revoke', async () => {
      const u = await seedUser({ email: 'dev2@example.test', roles: ['tenant'], org });
      const a = new Jar();
      const b = new Jar();
      await post('/sign-in/email', { email: 'dev2@example.test', password: PW }, a);
      await post('/sign-in/email', { email: 'dev2@example.test', password: PW }, b);
      const other = (await listDevices(auth, a.headers())).find((d) => !d.current)!;
      expect(await revokeDevice(auth, authDb, a.headers(), other.id)).toBe(true);
      const [n] =
        await admin.sql`select count(*)::int as n from audit_events where action = 'auth.device_revoked' and actor_user_id = ${u.id}`;
      expect(n!.n).toBe(1);
    });

    it('fails closed when the sign-in audit row cannot be written: no session survives', async () => {
      const u = await seedUser({ email: 'noaudit@example.test', roles: ['tenant'], org });
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const auth3 = createAuth({
        db: authDb,
        secret: SECRET,
        baseURL: BASE,
        otpSender: otp,
        emailSender: mail,
        rateLimitStore: new MemoryRateLimitStore(),
        secureCookies: false,
        breachedPasswordCheck: false,
        recordAudit: () => Promise.reject(new Error('audit store down')),
      });
      const r = await handleAuthRequest(
        auth3,
        new Request(`${BASE}/api/auth/sign-in/email`, {
          method: 'POST',
          headers: {
            origin: BASE,
            'content-type': 'application/json',
            'x-forwarded-for': '10.7.1.1',
          },
          body: JSON.stringify({ email: 'noaudit@example.test', password: PW }),
        }),
        { trustedProxyHops: 1 },
      );
      expect(r.status).toBe(401);
      const [n] = await admin.sql`select count(*)::int as n from sessions where user_id = ${u.id}`;
      expect(n!.n).toBe(0);
      expect(spy).toHaveBeenCalledWith('ALERT auth audit write failed');
      spy.mockRestore();
    });

    it('refuses to start in production while PII is stored in plaintext (E-06), unless the staging override is set', () => {
      const base = {
        db: authDb,
        secret: SECRET,
        baseURL: BASE,
        otpSender: otp,
        emailSender: mail,
        rateLimitStore: new MemoryRateLimitStore(),
        secureCookies: true,
        breachedPasswordCheck: false,
      };
      expect(() => createAuth({ ...base, production: true })).toThrow(/E-06/);
      expect(() =>
        createAuth({ ...base, production: true, allowPlaintextPii: true }),
      ).not.toThrow();
    });

    it('retention job deletes expired sessions and verifications only', async () => {
      const u = await seedUser({ email: 'purge@example.test', roles: ['tenant'], org });
      await admin.sql`insert into sessions (user_id, token, expires_at) values (${u.id}, 'tok-expired', now() - interval '1 day'), (${u.id}, 'tok-live', now() + interval '1 day')`;
      await admin.sql`insert into verifications (identifier, value, expires_at) values ('phone-number-otp-+254700000999', '123456:0', now() - interval '1 hour'), ('live', 'x', now() + interval '1 hour')`;
      const r = await purgeExpiredAuthData(authDb);
      expect(r.sessions).toBeGreaterThanOrEqual(1);
      expect(r.verifications).toBeGreaterThanOrEqual(1);
      const left =
        await admin.sql`select token from sessions where token in ('tok-expired','tok-live')`;
      expect(left.map((x) => x.token)).toEqual(['tok-live']);
      const v =
        await admin.sql`select identifier from verifications where identifier in ('live', 'phone-number-otp-+254700000999')`;
      expect(v.map((x) => x.identifier)).toEqual(['live']);
    });
  });

  describe('database privileges (RLS / grants)', () => {
    it('the app role cannot read or write any credential table', async () => {
      for (const table of ['accounts', 'sessions', 'verifications', 'two_factors']) {
        await expect(appDb.sql.unsafe(`select 1 from ${table}`), table).rejects.toThrow(
          /permission denied/,
        );
        await expect(appDb.sql.unsafe(`delete from ${table}`), table).rejects.toThrow(
          /permission denied/,
        );
      }
    });
    it('cross-org: the app role in org A sees no users of org B and no secrets', async () => {
      const [b] = await admin.sql<
        { id: string }[]
      >`insert into organizations (name) values ('Org B') returning id`;
      const other = await seedUser({ email: 'orgb-owner@example.test', roles: [], org: b!.id });
      await admin.sql`insert into memberships (organization_id, user_id, role, status) values (${b!.id}, ${other.id}, 'owner', 'active')`;
      const visible = await appDb.withOrg(org, (tx) =>
        tx.execute(`select email from users` as never),
      );
      expect(JSON.stringify(visible)).not.toContain('orgb-owner@example.test');
    });
    it('the auth role cannot touch org data and can only insert platform-level audit rows', async () => {
      await expect(authDb.sql.unsafe('select 1 from organizations')).rejects.toThrow(
        /permission denied/,
      );
      await expect(authDb.sql.unsafe("update memberships set role = 'owner'")).rejects.toThrow(
        /permission denied/,
      );
      await expect(authDb.sql.unsafe('select 1 from audit_events')).rejects.toThrow(
        /permission denied/,
      );
      await expect(
        authDb.sql.unsafe(
          `insert into audit_events (organization_id, action, entity_type) values ('${org}', 'x', 'x')`,
        ),
      ).rejects.toThrow(/row-level security/);
      await expect(authDb.sql.unsafe('delete from users')).rejects.toThrow(/permission denied/);
    });
    it('every credential table has ENABLE + FORCE RLS', async () => {
      const rows = await admin.sql<
        { relname: string; relrowsecurity: boolean; relforcerowsecurity: boolean }[]
      >`
        select relname, relrowsecurity, relforcerowsecurity from pg_class
        where relname in ('accounts','sessions','verifications','two_factors')`;
      expect(rows).toHaveLength(4);
      for (const r of rows)
        expect([r.relname, r.relrowsecurity, r.relforcerowsecurity]).toEqual([
          r.relname,
          true,
          true,
        ]);
    });
    it('audit rows from auth never contain phone numbers, emails, codes or tokens', async () => {
      const rows =
        await admin.sql`select after, entity_id, user_agent from audit_events where action like 'auth.%'`;
      const blob = JSON.stringify(rows);
      expect(blob).not.toMatch(/\+2547\d{8}/);
      expect(blob).not.toMatch(/@example\.test/);
    });
  });
});
