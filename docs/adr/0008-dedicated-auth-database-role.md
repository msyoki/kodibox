# 0008. Dedicated database role for the auth server

Date: 2026-11-15. Status: accepted.

## Context

Better Auth must look users up by email or phone before any organization context exists, and it reads and writes credential data (password hashes, TOTP secrets, backup codes, session tokens). The runtime app role `kodibox_app` is scoped by RLS to one organization and must never see other users' secrets.

## Decision

- Add a third login role, `kodibox_auth` (NOSUPERUSER, NOBYPASSRLS, not an owner), used only by the auth server through `AUTH_DATABASE_URL`.
- `accounts`, `sessions`, `verifications` and `two_factors` are global tables with ENABLE and FORCE RLS. Policies and grants exist only for `kodibox_auth`. `kodibox_app` has no grant on them.
- On `users`, `kodibox_auth` gets SELECT, INSERT and UPDATE (no DELETE). On `memberships` it gets read-only access across orgs, so the auth layer can tell whether TOTP is mandatory. On `audit_events` it can only INSERT rows with `organization_id IS NULL`. It has no grant on any org-scoped business table.
- `users` stays the single user table (Better Auth `name` maps to `display_name`); phone numbers are E.164 in `users.phone_number` until E-06 adds envelope encryption and a blind index.
- In production `AUTH_DATABASE_URL` is required and must connect as `kodibox_auth`.

## Consequences

A SQL flaw in org-scoped code cannot reach credentials; a compromised auth connection cannot reach org data. Cost: one more role, password and connection pool to operate, and `db:bootstrap` gains `KODIBOX_AUTH_PASSWORD`.

## Addendum: E-04 review hardening

- **Session tokens are hashed at rest.** `withHashedSessionTokens` (packages/auth) wraps the Better Auth adapter: `sessions.token` stores sha256(token); the raw token only lives in the signed cookie. Listing a user's sessions returns hashes, never credentials.
- **Backup codes** are encrypted with AUTH_SECRET, not hashed: Better Auth only supports plain, encrypted or a custom reversible pair because it reads the list back to compare. Accepted deviation, mitigated by 10 single-use codes and per-IP and per-account lockout. Revisit if Better Auth adds hashed codes.
- **Endpoint allowlist.** The web route exposes only the endpoints the UI uses (see `ALLOWED` in packages/auth/src/handler.ts); everything else is 404, and password-reset-by-phone and OTP-2FA are also in Better Auth's `disabledPaths`. Public sign-up is closed until onboarding exists (AUTH_PUBLIC_SIGNUP).
- **Plaintext PII guard.** `users.phone_number` and `verifications.identifier` are plaintext until E-06. In production `createAuth` refuses to start unless AUTH_ALLOW_PLAINTEXT_PII=1 (staging only). E-06 is a production deploy blocker.
- **App role** can no longer read `phone_number`, `email_verified`, `two_factor_enabled` or `image` (column-level SELECT grant).
- Not done (follow-ups): progressive lockout (15 min, 1 h, 24 h) with owner notification; session rotation on step-up and privilege change; 24-hour cooling period on phone/email/2FA change; TOTP step-up; queue-backed delivery (messages are dispatched in-process after the response, so a crash can drop a code).

## Addendum 2: second review
- **Session revocation is by session id.** Better Auth's revoke-by-token endpoints are not exposed (tokens are hashed at rest, so a token read back from a listing can never match). Use `revokeDevice` / `revokeAllOtherDevices` (delete by id). The token store returns the sentinel `[hashed]` for any token it did not receive from the caller.
- **Client IP trust.** One helper (`trustedClientHeaders`) writes the trusted client-IP header for both the auth route and server-side helpers; the Edge middleware strips any inbound copy on every request. In production, requests with no resolvable IP are rejected (400). The origin MUST be reachable only through the trusted proxy; otherwise X-Forwarded-For is attacker-controlled and per-IP limits are meaningless.
- **Password-taking endpoints** (enable/disable 2FA, regenerate backup codes, change password) share the per-user step-up limit (5 per 15 minutes); failures are audited as `auth.step_up_failed`.
- **Password recovery is intentionally unavailable** (reset endpoints are not allowlisted). Required design when built (follow-up): email link plus, for owner/manager/accountant, a TOTP or recovery code; per-account and per-IP limits (3 per hour per account); single-use 30-minute tokens; all sessions revoked on completion; audit `auth.password_reset_*`; notification to all existing channels; never phone-only for roles with money or export access (SECURITY.md 5.5).
- **Follow-ups (not built):** schedule `purge:expired` daily in apps/worker; pseudonymisation function and a `dsr_requests` hook (DATA_MODEL.md erasure); link the `ALERT auth audit write failed` alert to the breach-response runbook; progressive lockout with notification; session rotation on step-up.
