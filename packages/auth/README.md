# @kodibox/auth

Better Auth server for Kodibox (E-04). Pure rules (roles that need TOTP, session gate, rate-limit windows, generic errors, phone normalisation) live in `@kodibox/core/auth`; this package wires them to Better Auth and Postgres.

## Model

- One user concept: Better Auth's `user` is the existing `users` table (`name` maps to `display_name`). Credential tables `accounts`, `sessions`, `verifications`, `two_factors` are global and reachable only by the `kodibox_auth` role (`AUTH_DATABASE_URL`). The app role (`kodibox_app`) has no grant on them. See migration `0002_auth.sql` and ADR 0008.
- Passwords: argon2id (64 MiB, t=3, p=1), min 12 characters; HIBP check on in production.
- Sign-in: email + password, phone + password, phone + SMS OTP (tenants and caretakers only; owner/manager/accountant or anyone with TOTP enabled can never use OTP).
- TOTP is mandatory for owner/manager/accountant in any org. `resolveSession()` returns `enrol_2fa` until TOTP is verified; `requireSession()` in the web app redirects to `/login/2fa-setup`. Mandatory roles cannot disable TOTP. Backup codes are issued at enrolment.
- Sessions: 30-day maximum, 5-minute refresh, cookies httpOnly + SameSite=Lax, `__Host-` prefix and Secure in production. Privileged roles are cut at 30 minutes idle / 12 hours absolute, others 12 h idle / 30 days (`evaluateSessionGate`). No cookie cache, so revocation is immediate.
- Devices: `listDevices`, `revokeDevice`, `revokeAllOtherDevices`. Sign-out deletes the session.
- Step-up: `stepUpWithPassword`, `markSteppedUp`, `isSteppedUp` (10-minute window); `requireStepUp` in `apps/web/src/server/session.ts`. TOTP step-up is a follow-up.

## Rate limits and enumeration

Sliding windows (`AUTH_RATE_LIMITS` in core): sign-in 5/15 min per account and 20/15 min per IP, OTP send 3/h per phone and 20/h per IP, OTP verify 5/5 min per phone, sign-up 10/h per IP, reset 3/h per account, TOTP 20/15 min per IP plus Better Auth's own lockout (5 failures, 15 min). Keys use a hash of the identifier. Store: Redis when reachable (`REDIS_URL`), otherwise in-process memory (also the fallback if Redis errors, so auth degrades instead of failing). Better Auth's per-IP limiter (memory) is a backstop.

`handleAuthRequest` replaces every failed response on sign-in, OTP, sign-up, reset and 2FA-verify paths with one generic body (429 stays 429). Unknown numbers and staff numbers get the same "code sent" answer but no SMS. Sign-up with an existing email behaves like a new sign-up (email verification required) and never touches the existing credentials. Pre-existing rows created by the invite flow only get credentials through a verified email or OTP.

## Audit

`auth.sign_in` (method only), `auth.sign_out`, `auth.2fa_enrol_started`, `auth.2fa_disabled`, `auth.rate_limited` (scope and limit, once when a limit is first crossed). Platform-level rows (`organization_id` null, append-only); no phone, email, code or token in `after`.

## Local use

See the root README ("Run the web app with real sign-in"). `pnpm --filter @kodibox/auth seed:demo` creates the demo users (run by `pnpm db:seed`). Tests: `pnpm --filter @kodibox/auth test` (Testcontainers; needs Docker).

## Hardening added after security and compliance review

Endpoint allowlist (404 otherwise) plus `disabledPaths`; trusted-proxy IP resolution (`TRUSTED_PROXY_HOPS`, right-most untrusted hop, IPv6 /64); session gate in the auth before-hook for every session-using path, privileged sessions capped at 12 h at creation, enrolment-only paths while TOTP is pending; background message delivery (responses never depend on the provider); session tokens hashed at rest; audit of password change, reset, update-user, backup codes, 2FA enrolment, revokes, step-up and device revoke; sign-in and 2FA-disable fail closed if the audit row cannot be written; Redis-down fail-closed for OTP-send/reset; plaintext-PII production guard; retention job `purge:expired`; `no_membership` sessions go to onboarding.

## Not done yet

Progressive lockout tiers (15 min, 1 h, 24 h) and owner notification; 24-hour cooling period on phone/email/2FA change; session rotation on privilege change; password-reset UI and email/SMS providers; mobile bearer sessions (MA-03); passkeys; TOTP step-up; encryption of `users.phone_number` (E-06).
