import { createHash } from 'node:crypto';
import {
  AUTH_RATE_LIMITS,
  CLIENT_IP_HEADER,
  SESSION_LIMITS,
  canSignInWithOtp,
  checkRateLimit,
  evaluateSessionGate,
  ipRateLimitBucket,
  isE164Kenyan,
  normalizeKenyanPhone,
  requiresTwoFactor,
  SESSION_COOKIE_NAME_PROD,
  type RateLimitRule,
  type RateLimitStore,
} from '@kodibox/core';
import {
  accounts,
  listActiveRoles,
  recordAuthAudit,
  sessions,
  twoFactors,
  users,
  verifications,
  type AuthAuditInput,
  type AuthDbClient,
} from '@kodibox/db/auth';
import type { AuthEmailSender, OtpSender } from '@kodibox/integrations';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError, createAuthMiddleware, getSessionFromCtx } from 'better-auth/api';
import { haveIBeenPwned, phoneNumber, twoFactor } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword } from './password';
import { withHashedSessionTokens } from './session-token-store';

export const SESSION_COOKIE_PREFIX = 'kodibox';
export { CLIENT_IP_HEADER };

/** Endpoints that must never be reachable (reset-by-phone has no rate limit/step-up; OTP-2FA is not offered). */
export const DISABLED_AUTH_PATHS = [
  '/phone-number/request-password-reset',
  '/phone-number/reset-password',
  '/two-factor/send-otp',
  '/two-factor/verify-otp',
] as const;

/** While TOTP enrolment is pending, a privileged session may only reach these endpoints. */
const ENROLMENT_ONLY_PATHS = new Set([
  '/two-factor/enable',
  '/two-factor/verify-totp',
  '/get-session',
  '/sign-out',
]);

/** Endpoints that re-check the account password for an already signed-in session. */
const PASSWORD_GATED_PATHS = new Set([
  '/two-factor/enable',
  '/two-factor/disable',
  '/two-factor/generate-backup-codes',
  '/change-password',
]);

/** Paths that run before a session exists (or establish one); the session gate does not apply. */
const SESSIONLESS_PREFIXES = [
  '/sign-in/',
  '/sign-up/',
  '/phone-number/',
  '/verify-email',
  '/ok',
  '/error',
];

export interface CreateAuthDeps {
  db: AuthDbClient;
  secret: string;
  baseURL: string;
  trustedOrigins?: string[];
  otpSender: OtpSender;
  /** Registered SMS sender id (AT_SENDER_ID). */
  otpSenderId?: string;
  emailSender: AuthEmailSender;
  rateLimitStore: RateLimitStore;
  /** Secure + __Host- cookies. True in production. */
  secureCookies: boolean;
  /** HIBP k-anonymity breached-password check (outbound call). Default: only when secureCookies. */
  breachedPasswordCheck?: boolean;
  /** Production runtime: enables the plaintext-PII startup guard. */
  production?: boolean;
  /** Explicit, documented staging override of the plaintext-PII guard (AUTH_ALLOW_PLAINTEXT_PII=1). */
  allowPlaintextPii?: boolean;
  /** Test seam / alerting hook. Defaults to the append-only audit_events writer. */
  recordAudit?: (db: AuthDbClient, input: AuthAuditInput) => Promise<void>;
  /** Test hook for time-dependent limits. */
  now?: () => number;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex').slice(0, 32);

function clientIp(headers: Headers | undefined): string | null {
  const ip = headers?.get(CLIENT_IP_HEADER)?.trim();
  return ip && /^[0-9a-fA-F:.]{2,45}$/.test(ip) ? ip : null;
}

const tooMany = () =>
  new APIError('TOO_MANY_REQUESTS', { message: 'Too many attempts', code: 'RATE_LIMITED' });
const denied = () =>
  new APIError('UNAUTHORIZED', { message: 'Invalid credentials', code: 'INVALID_CREDENTIALS' });

/** Fire-and-forget so response bodies, status and timing never depend on message delivery. */
function background(task: () => Promise<void>): void {
  setTimeout(() => {
    task().catch((e: unknown) => {
      // Never log the error object or message: provider errors can echo the destination number or address.
      console.error(`ALERT auth message delivery failed code=${deliveryFailureCode(e)}`);
    });
  }, 0);
}

/** Coded, PII-free reason for a failed delivery. */
export function deliveryFailureCode(e: unknown): string {
  if (e instanceof Error && /^No (SMS|email) provider configured$/.test(e.message))
    return 'NO_PROVIDER';
  const code = (e as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && /^[A-Za-z0-9_]{2,32}$/.test(code)) return code.toUpperCase();
  const name = e instanceof Error ? e.name : '';
  return /^[A-Za-z]{2,40}$/.test(name) ? name.toUpperCase() : 'UNKNOWN';
}

export function createAuth(deps: CreateAuthDeps) {
  if (deps.production && !deps.allowPlaintextPii) {
    throw new Error(
      'Auth refuses to start in production: users.phone_number and verification identifiers are stored in plaintext until E-06 (PII envelope encryption + blind index) lands. ' +
        'E-06 is a production deploy blocker. Staging only: set AUTH_ALLOW_PLAINTEXT_PII=1 (documented in SECURITY.md).',
    );
  }
  const { db } = deps;
  const now = deps.now ?? Date.now;
  const writeAudit = deps.recordAudit ?? recordAuthAudit;

  async function audit(
    action: string,
    headers: Headers | undefined,
    extra: {
      actorUserId?: string | null;
      after?: Record<string, unknown>;
      critical?: boolean;
    } = {},
  ): Promise<void> {
    try {
      await writeAudit(db, {
        action,
        actorUserId: extra.actorUserId ?? null,
        ip: clientIp(headers),
        userAgent: headers?.get('user-agent') ?? null,
        after: extra.after ?? null,
      });
    } catch {
      // Alert hook: a metric/log shipper should page on this exact prefix (no PII in the line).
      console.error('ALERT auth audit write failed');
      // Fail closed for sign-in and 2FA disable: no audit row, no action.
      if (extra.critical) throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Unavailable' });
    }
  }

  /** Counts a hit; blocks when over the rule. One audit row when a limit is first exceeded. */
  async function limit(
    scope: string,
    key: string | null,
    rule: RateLimitRule,
    headers: Headers | undefined,
  ): Promise<void> {
    if (!key) return;
    let d;
    try {
      d = await checkRateLimit(deps.rateLimitStore, `${scope}:${key}`, rule, now());
    } catch {
      // Store unavailable for a fail-closed scope (OTP send, reset): refuse rather than allow floods.
      throw tooMany();
    }
    if (d.justExceeded) {
      await audit('auth.rate_limited', headers, {
        after: { scope, max: rule.max, windowSec: rule.windowMs / 1000 },
      });
    }
    if (!d.allowed) throw tooMany();
  }

  async function otpEligibility(phone: string) {
    const rows = await db.orm
      .select({ id: users.id, twoFactorEnabled: users.twoFactorEnabled })
      .from(users)
      .where(eq(users.phoneNumber, phone))
      .limit(1);
    const u = rows[0];
    if (!u) return { exists: false as const, eligible: false };
    const roles = await listActiveRoles(db, u.id);
    return {
      exists: true as const,
      id: u.id,
      roles,
      eligible: canSignInWithOtp(roles, u.twoFactorEnabled),
    };
  }

  const breached = deps.breachedPasswordCheck ?? deps.secureCookies;
  const adapterFactory = withHashedSessionTokens(
    drizzleAdapter(db.orm, {
      provider: 'pg',
      schema: { users, sessions, accounts, verifications, twoFactors },
    }),
  );

  return betterAuth({
    appName: 'Kodibox',
    baseURL: deps.baseURL,
    secret: deps.secret,
    trustedOrigins: [deps.baseURL, ...(deps.trustedOrigins ?? [])],
    disabledPaths: [...DISABLED_AUTH_PATHS],
    database: adapterFactory,
    user: { modelName: 'users', fields: { name: 'displayName' } },
    session: {
      modelName: 'sessions',
      // Longest allowed lifetime (tenants/caretakers). Privileged sessions are cut to 12 h at
      // creation (databaseHooks below) and by the gate on every request.
      expiresIn: 30 * 24 * 60 * 60,
      updateAge: 5 * 60,
      freshAge: 10 * 60,
      cookieCache: { enabled: false }, // revocation must take effect immediately
    },
    account: { modelName: 'accounts' },
    verification: { modelName: 'verifications' },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const roles = await listActiveRoles(db, session.userId);
            if (!requiresTwoFactor(roles)) return;
            const cap = now() + SESSION_LIMITS.privileged.absoluteMs;
            return {
              data: { ...session, expiresAt: new Date(Math.min(session.expiresAt.getTime(), cap)) },
            };
          },
        },
      },
    },
    advanced: {
      cookiePrefix: SESSION_COOKIE_PREFIX,
      useSecureCookies: deps.secureCookies,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: deps.secureCookies },
      cookies: deps.secureCookies
        ? { session_token: { name: SESSION_COOKIE_NAME_PROD, attributes: { path: '/' } } }
        : undefined,
      database: { generateId: false }, // users/sessions use DB uuidv7() defaults
      // handleAuthRequest sets this header from the trusted-proxy resolver (right-most untrusted hop).
      ipAddress: { ipAddressHeaders: [CLIENT_IP_HEADER] },
    },
    // Better Auth's in-memory limiter stays as a generic per-IP backstop (120/min). The credential,
    // OTP and 2FA paths use the persistent, per-account limits in the hooks below instead of its
    // built-in 3-per-10-seconds rules.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 120,
      storage: 'memory',
      customRules: {
        '/sign-in/*': false,
        '/sign-up/*': false,
        '/phone-number/*': false,
        '/two-factor/*': false,
      },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      // Also makes duplicate sign-ups return a synthetic success (no account enumeration).
      requireEmailVerification: true,
      autoSignIn: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      password: { hash: hashPassword, verify: verifyPassword },
      sendResetPassword: ({ user, url }) => {
        background(() =>
          deps.emailSender.sendAuthEmail({ to: user.email, kind: 'reset_password', link: url }),
        );
        return Promise.resolve();
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: ({ user, url }) => {
        background(() =>
          deps.emailSender.sendAuthEmail({ to: user.email, kind: 'verify_email', link: url }),
        );
        return Promise.resolve();
      },
    },
    plugins: [
      phoneNumber({
        otpLength: 6,
        expiresIn: 5 * 60,
        allowedAttempts: 3,
        phoneNumberValidator: (p) => isE164Kenyan(p),
        // Delivery is detached from the request: the response (status, body, timing) is identical
        // whether the number is unknown, staff, eligible or the provider is down. Only a number
        // attached to a user record that may use OTP is ever messaged.
        sendOTP: ({ phoneNumber: phone, code }) => {
          background(async () => {
            const e = await otpEligibility(phone);
            if (e.eligible) {
              await deps.otpSender.sendOtp({
                phoneE164: phone,
                code,
                senderId: deps.otpSenderId,
                messageClass: 'otp',
              });
            }
          });
        },
      }),
      twoFactor({
        issuer: 'Kodibox',
        totpOptions: { digits: 6, period: 30 },
        // Backup codes are encrypted with AUTH_SECRET (not hashed): Better Auth must read them back
        // to compare. Documented exception in ADR 0008.
        backupCodeOptions: { amount: 10, length: 10, storeBackupCodes: 'encrypted' },
        // Trusted-device skip of the TOTP challenge is capped at 12 h (privileged roles included).
        trustDeviceMaxAge: 12 * 60 * 60,
        twoFactorCookieMaxAge: 10 * 60,
        accountLockout: { enabled: true, maxFailedAttempts: 5, durationSeconds: 15 * 60 },
        schema: { twoFactor: { modelName: 'twoFactors' } },
      }),
      ...(breached ? [haveIBeenPwned()] : []),
    ],
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const headers = ctx.request?.headers ?? ctx.headers;
        const ip = clientIp(headers);
        // No resolvable client IP: skip only the per-IP limits (per-account limits still apply).
        // Production rejects such requests earlier (handleAuthRequest requireClientIp).
        const ipKey = ip ? ipRateLimitBucket(ip) : null;
        const body = (ctx.body ?? {}) as Record<string, unknown>;
        const path = ctx.path;
        const state = ctx.context as unknown as Record<string, unknown>;

        // ---- Session gate on every session-using path (not only page renders) ----
        if (!SESSIONLESS_PREFIXES.some((p) => path.startsWith(p))) {
          const s = await getSessionFromCtx(ctx);
          if (s) {
            state.__kbActor = s.user.id;
            const roles = await listActiveRoles(db, s.user.id);
            const gate = evaluateSessionGate({
              roles,
              twoFactorEnabled: Boolean(s.user.twoFactorEnabled),
              sessionCreatedAt: new Date(s.session.createdAt),
              sessionUpdatedAt: new Date(s.session.updatedAt),
              now: new Date(now()),
            });
            if (gate.status === 'expired') {
              await db.orm.delete(sessions).where(eq(sessions.id, s.session.id));
              // Let sign-out through so the browser's cookie is cleared.
              if (path === '/sign-out') return;
              throw new APIError('UNAUTHORIZED', { message: 'Session expired' });
            }
            if (gate.status === 'enrol_2fa') {
              if (!ENROLMENT_ONLY_PATHS.has(path)) {
                throw new APIError('FORBIDDEN', { message: 'Two-factor setup required' });
              }
              state.__kbEnrolling = path === '/two-factor/verify-totp';
            }
          }
        }

        if (path === '/sign-in/email') {
          await limit('signin-ip', ipKey, AUTH_RATE_LIMITS.signInPerIp, headers);
          const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
          await limit(
            'signin-acct',
            email && sha256(email),
            AUTH_RATE_LIMITS.signInPerAccount,
            headers,
          );
          return;
        }

        if (path === '/sign-in/phone-number') {
          const phone =
            typeof body.phoneNumber === 'string' ? normalizeKenyanPhone(body.phoneNumber) : null;
          await limit('signin-ip', ipKey, AUTH_RATE_LIMITS.signInPerIp, headers);
          if (!phone) throw denied();
          await limit('signin-acct', sha256(phone), AUTH_RATE_LIMITS.signInPerAccount, headers);
          // Equalise timing for unknown numbers (the plugin returns before hashing otherwise).
          const rows = await db.orm
            .select({ id: users.id })
            .from(users)
            .where(eq(users.phoneNumber, phone))
            .limit(1);
          if (!rows[0] && typeof body.password === 'string') await hashPassword(body.password);
          return { context: { ...ctx, body: { ...body, phoneNumber: phone } } };
        }

        if (path === '/sign-up/email') {
          await limit('signup-ip', ipKey, AUTH_RATE_LIMITS.signUpPerIp, headers);
          // Never let a sign-up bind (squat) a phone number; numbers arrive via the invite flow + OTP.
          const {
            phoneNumber: _p,
            phoneNumberVerified: _v,
            twoFactorEnabled: _t,
            emailVerified: _e,
            ...clean
          } = body;
          void [_p, _v, _t, _e];
          return { context: { ...ctx, body: clean } };
        }

        if (path === '/phone-number/send-otp') {
          const phone =
            typeof body.phoneNumber === 'string' ? normalizeKenyanPhone(body.phoneNumber) : null;
          await limit('otp-send-ip', ipKey, AUTH_RATE_LIMITS.otpSendPerIp, headers);
          if (!phone) throw denied();
          await limit('otp-send-phone', sha256(phone), AUTH_RATE_LIMITS.otpSendPerPhone, headers);
          return { context: { ...ctx, body: { ...body, phoneNumber: phone } } };
        }

        if (path === '/phone-number/verify') {
          const phone =
            typeof body.phoneNumber === 'string' ? normalizeKenyanPhone(body.phoneNumber) : null;
          await limit('otp-verify-ip', ipKey, AUTH_RATE_LIMITS.otpVerifyPerIp, headers);
          if (!phone) throw denied();
          await limit(
            'otp-verify-phone',
            sha256(phone),
            AUTH_RATE_LIMITS.otpVerifyPerPhone,
            headers,
          );
          // Phone change needs step-up + 24 h cooling period (SECURITY.md 5.5): not available yet.
          if (body.updatePhoneNumber) throw denied();
          // OTP is a low-privilege factor: staff and TOTP-enrolled users can never sign in with it.
          const e = await otpEligibility(phone);
          if (e.exists && !e.eligible) throw denied();
          return { context: { ...ctx, body: { ...body, phoneNumber: phone } } };
        }

        if (path === '/request-password-reset' || path === '/forget-password') {
          await limit('reset-ip', ipKey, AUTH_RATE_LIMITS.signInPerIp, headers);
          const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null;
          await limit(
            'reset-acct',
            email && sha256(email),
            AUTH_RATE_LIMITS.resetPerAccount,
            headers,
          );
          return;
        }

        if (path === '/reset-password') {
          await limit('reset-ip', ipKey, AUTH_RATE_LIMITS.signInPerIp, headers);
          return;
        }

        if (path === '/two-factor/verify-totp' || path === '/two-factor/verify-backup-code') {
          await limit('2fa-ip', ipKey, AUTH_RATE_LIMITS.twoFactorPerIp, headers);
          return;
        }

        // Endpoints that take the account password are password-guessing oracles for a hijacked
        // session: limit them per user (same budget as step-up) and audit failures in the after-hook.
        if (PASSWORD_GATED_PATHS.has(path) && state.__kbActor) {
          await limit('stepup', state.__kbActor as string, AUTH_RATE_LIMITS.stepUpPerUser, headers);
        }

        if (path === '/change-password') {
          // A password change always ends every other session.
          return { context: { ...ctx, body: { ...body, revokeOtherSessions: true } } };
        }

        if (path === '/two-factor/disable') {
          const actor = state.__kbActor as string | undefined;
          if (actor) {
            const roles = await listActiveRoles(db, actor);
            // Mandatory 2FA roles cannot switch it off (attacker with a hijacked session could).
            if (requiresTwoFactor(roles))
              throw new APIError('FORBIDDEN', { message: 'Not allowed' });
            await audit('auth.2fa_disabled', headers, { actorUserId: actor, critical: true });
          }
          return;
        }

        if (path === '/sign-out') {
          const actor = state.__kbActor as string | undefined;
          if (actor) await audit('auth.sign_out', headers, { actorUserId: actor });
          return;
        }

        if (
          path === '/revoke-session' ||
          path === '/revoke-sessions' ||
          path === '/revoke-other-sessions'
        ) {
          const actor = state.__kbActor as string | undefined;
          if (actor)
            await audit('auth.sessions_revoked', headers, {
              actorUserId: actor,
              after: { scope: path.slice(1) },
            });
          return;
        }
      }),

      after: createAuthMiddleware(async (ctx) => {
        const headers = ctx.request?.headers ?? ctx.headers;
        const path = ctx.path;
        const newSession = ctx.context.newSession;
        const failed = ctx.context.returned instanceof Error;
        const state = ctx.context as unknown as Record<string, unknown>;
        const actor = (state.__kbActor as string | undefined) ?? newSession?.user.id ?? null;

        if (failed && PASSWORD_GATED_PATHS.has(path) && actor) {
          await audit('auth.step_up_failed', headers, { actorUserId: actor, after: { path } });
          return;
        }

        if (!failed) {
          if (path === '/two-factor/enable')
            return void (await audit('auth.2fa_enrol_started', headers, { actorUserId: actor }));
          if (path === '/two-factor/generate-backup-codes')
            return void (await audit('auth.backup_codes_regenerated', headers, {
              actorUserId: actor,
            }));
          if (path === '/change-password')
            return void (await audit('auth.password_changed', headers, { actorUserId: actor }));
          if (path === '/reset-password' || path === '/phone-number/reset-password')
            return void (await audit('auth.password_reset_completed', headers, {
              actorUserId: actor,
            }));
          if (path === '/update-user')
            return void (await audit('auth.user_updated', headers, {
              actorUserId: actor,
              after: { fields: Object.keys((ctx.body ?? {}) as object).sort() },
            }));
          if (path === '/two-factor/verify-totp' && state.__kbEnrolling) {
            await audit('auth.2fa_enrolled', headers, { actorUserId: actor });
            return;
          }
        }

        const signInPaths = new Set([
          '/sign-in/email',
          '/sign-in/phone-number',
          '/phone-number/verify',
          '/two-factor/verify-totp',
          '/two-factor/verify-backup-code',
        ]);
        if (!signInPaths.has(path)) return;

        if (failed) {
          // Repeated failures are counted (one audit row when 5 failures land in 15 min), never one row per try.
          await limit(
            'fail-count',
            sha256(`${ipRateLimitBucket(clientIp(headers))}|${path}`),
            { max: 4, windowMs: 15 * 60_000 },
            headers,
          ).catch(() => undefined);
          return;
        }
        if (newSession) {
          const method =
            path === '/sign-in/email'
              ? 'password'
              : path === '/sign-in/phone-number'
                ? 'phone_password'
                : path === '/phone-number/verify'
                  ? 'sms_otp'
                  : path === '/two-factor/verify-totp'
                    ? 'totp'
                    : 'backup_code';
          try {
            await audit('auth.sign_in', headers, {
              actorUserId: newSession.user.id,
              after: { method },
              critical: true,
            });
          } catch (e) {
            // No audit row, no session: revoke what was just created and fail the sign-in.
            await ctx.context.internalAdapter
              .deleteSession(newSession.session.token)
              .catch(() => undefined);
            throw e;
          }
        }
      }),
    },
  });
}

export type KodiboxAuth = ReturnType<typeof createAuth>;
