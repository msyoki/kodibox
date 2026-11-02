# Kodibox Security: Threat Model and Mandatory Controls

Status: v1 draft. Items marked **[LEGAL]** need confirmation from a Kenyan lawyer before launch.
Owner: security lead. Reviewed at every milestone and after every incident.

Kodibox holds tenant PII (names, national IDs, KRA PINs, phone numbers), M-Pesa and bank payment data, and lease documents for many landlord organizations. A single cross-org leak or forged payment would end the business. Controls below are mandatory unless an ADR records an exception.

## 1. Security objectives

1. **Confidentiality:** no user sees data outside their organization and role. PII is encrypted at the application layer and masked by default.
2. **Integrity of money:** the ledger reflects only verified payments; entries are append-only; every change is attributable and tamper-evident.
3. **Availability:** rent collection windows (1st to 10th of month) must survive worker, Redis or provider outages. Webhooks are acknowledged fast and replayable.
4. **Accountability:** every sensitive action is in `audit_events` with actor, IP, user agent, diff.
5. **Privacy:** minimum collection, defined retention, data subject rights honoured (see `docs/PRIVACY_BY_DESIGN.md`).
6. **Never hold client funds:** payments go to the landlord's own paybill/till/bank (CLAUDE.md rule 2). This removes the largest class of financial-theft risk.

## 2. Assurance target

- **OWASP ASVS 4.0 Level 2** for the whole product.
- **ASVS Level 3** for: authentication and session management (V2, V3), payment and webhook handling (V4 access control on money paths, V5 validation, V8 data protection, V13 API), cryptographic key management (V6), and the audit log (V7).
- Each PR touching these areas cites the ASVS requirement IDs it satisfies in the PR description.
- A self-assessment spreadsheet (ASVS checklist, status per requirement) is kept in the security folder of the team drive and reviewed quarterly.

## 3. Architecture and trust boundaries

```
Browser / Mobile --TLS--> Next.js web (RSC, Server Actions) --> Postgres (RLS) <-- Worker (BullMQ, Redis)
Safaricom Daraja / Banks --webhook--> web edge route (verify, enqueue) --> Worker (re-verify, credit)
Worker --> Africa's Talking SMS, Resend/SES email, KRA eTIMS, Daraja APIs
Web/Worker --> S3-compatible object storage (private) ; KMS (data keys)
Platform admin panel (separate route group, separate auth policy, VPN/IP restricted)
```

Trust boundaries: internet to web; web to DB; webhooks (untrusted source claiming to be Safaricom/bank); worker to third-party APIs; tenant org A to org B; org staff to platform staff.

## 4. STRIDE threat model per component

S = Spoofing, T = Tampering, R = Repudiation, I = Information disclosure, D = Denial of service, E = Elevation of privilege.

### 4.1 Web app (Next.js, browser)
- S: credential stuffing, phished sessions. Mitigate: argon2id, breached-password check, mandatory TOTP for privileged roles, device list, new-device alerts.
- T: XSS altering UI or stealing data; CSRF. Mitigate: React escaping, CSP with nonces, SameSite=Lax cookies plus Origin check on mutations.
- R: user denies action. Mitigate: audit events with IP and UA.
- I: PII in client bundles, caches, error pages. Mitigate: PII only via server components in masked form; reveal is an explicit audited action; `Cache-Control: no-store` on authenticated pages.
- D: expensive queries and exports. Mitigate: rate limits, pagination caps, export jobs queued per-org.
- E: client-side role checks only. Mitigate: server-side `can()` on every action.

### 4.2 Server Actions and API routes
- S: forged cross-site POSTs. Mitigate: Next.js Origin check, additional custom CSRF token on non-action routes.
- T: mass assignment, tampering with `organization_id` or amounts. Mitigate: Zod schemas with `.strict()`, org id derived from session never input.
- R: missing audit. Mitigate: wrapper `withAudit()` required by lint rule for mutating actions.
- I: verbose errors. Mitigate: `Result<T, AppError>`, generic messages, Sentry for detail.
- D: unbounded loops and large payloads. Mitigate: body size limits (1 MB default), rate limits per user, per org, per IP.
- E: IDOR. Mitigate: `can(user, action, resource)` plus RLS as second line.

### 4.3 Webhooks (Safaricom Daraja, banks)
- S: attacker posts fake "payment received". Mitigate: section 7 (IP allowlist, secret path token, Transaction Status re-verification).
- T: modified amount or account reference in transit or replay. Mitigate: TLS, amount and shortcode checks against re-verified data, idempotency on `TransID`.
- R: dispute over whether a payment arrived. Mitigate: raw payload stored encrypted, immutable.
- I: callbacks reveal payer MSISDN. Mitigate: encrypt raw payload, mask in logs.
- D: flood of callbacks. Mitigate: edge rate limit, respond fast, enqueue only, dedupe before enqueue.
- E: webhook handler running with platform-admin DB role. Mitigate: handler uses a narrow DB role that can insert `webhook_events` only; worker resolves org.

### 4.4 Worker (BullMQ, Redis)
- S: rogue process enqueuing jobs. Mitigate: Redis AUTH + TLS + private network; job payloads validated by Zod on consume.
- T: modified job data. Mitigate: payloads contain ids, not amounts; worker re-reads from DB.
- R: unknown job origin. Mitigate: job id, trace id and actor stored in audit.
- I: PII in job payloads and Redis persistence. Mitigate: ids only; Redis not shared with other apps; encrypted volume.
- D: poison jobs, retry storms. Mitigate: bounded retries with backoff, dead-letter queue, alerting.
- E: worker using superuser DB role. Mitigate: worker role subject to RLS; sets `app.current_org_id` per job; a separate audited role for cross-org scans (invoicing runs iterate orgs).

### 4.5 Database (PostgreSQL 16)
- S: stolen DB credentials. Mitigate: secrets in manager, per-service roles, IP allowlist, TLS required.
- T: UPDATE/DELETE on ledger. Mitigate: revoke UPDATE/DELETE on ledger and audit tables from app roles; triggers raise on mutation; hash chain on audit.
- R: untracked admin SQL. Mitigate: pgaudit for DDL and superuser sessions; break-glass access logged and reviewed.
- I: cross-org read. Mitigate: RLS on every tenant table (forced, `FORCE ROW LEVEL SECURITY`), app roles are not table owners and lack `BYPASSRLS`; CI test iterates all tables to assert policies exist.
- D: runaway queries. Mitigate: statement timeouts, connection pool limits per service.
- E: SQL injection. Mitigate: Drizzle parameterization; raw SQL banned except reviewed `sql` tagged templates.

### 4.6 Object storage (S3-compatible)
- S/E: public bucket misconfiguration. Mitigate: block public access, bucket policy denies non-TLS, IaC check in CI.
- T: replacing lease documents. Mitigate: object versioning plus object lock (compliance mode) on lease and statement buckets; content hash stored in DB.
- I: guessed URLs. Mitigate: random keys prefixed by org id, signed URLs valid at most 5 minutes, issued only after `can()`; SSE-KMS with per-org key context.
- D: storage abuse. Mitigate: per-org quotas, size limits.
- R: access trail. Mitigate: storage access logs retained 1 year.

### 4.7 SMS gateway (Africa's Talking) and email
- S: attacker triggers messages to arbitrary numbers. Mitigate: SMS only to numbers attached to a tenant/user record with lawful basis; OTP endpoints rate limited.
- T: altered message content/links. Mitigate: templates only, no free text with links except from org staff with permission; short links on owned domain.
- I: PII in message bodies. Mitigate: minimum content (name, amount, paybill, due date), no ID numbers.
- D/cost abuse: SMS pumping. Mitigate: per-org daily SMS caps, per-number cooldown, country allowlist (+254 by default), alert on spend spikes.
- R: delivery disputes. Mitigate: store provider message id and delivery report.

### 4.8 Platform admin panel
- S/E: compromised staff account. Mitigate: SSO plus hardware key (WebAuthn) mandatory, IP allowlist/VPN, separate session policy (15 min idle).
- T/R: undetected edits. Mitigate: every admin action audited with reason; no direct ledger edit capability exists in the panel at all.
- I: browsing tenant data. Mitigate: no PII access by default; "support access" requires org owner approval grant (time-boxed, max 24 h) or a ticket-linked break-glass with two-person approval; PII always masked.
- Impersonation: view-as sessions are read-only, banner shown, logged, and visible to the org owner.

### 4.9 Mobile app (Expo, Phase 3)
- S: stolen device. Mitigate: tokens in Keychain/Keystore, biometric re-auth for payments views, remote session revoke.
- T: tampered client. Mitigate: server enforces everything; no secrets in the app bundle; certificate pinning for api domain (with rotation plan).
- I: PII cached on device or in screenshots. Mitigate: no offline PII cache beyond the current statement; mask on app switcher; backups excluded.
- D/E: API abuse via reversed client. Mitigate: same rate limits and `can()` as web; attestation (Play Integrity, App Attest) considered for high-risk endpoints.

## 5. Top abuse cases and mitigations

### 5.1 Cross-organization data leak (IDOR)
Attacker (a landlord or caretaker) changes an id in a URL or action payload to read another org's tenant.
- RLS on every tenant table; `app.current_org_id` set per transaction from the session, never from input.
- `can()` checks ownership of the resource, not only role.
- Opaque ids (UUIDv7 or ULID); never sequential integers in URLs.
- Automated cross-tenant test suite: for each action and query, run as org B against org A ids and expect not-found. Runs in CI with Testcontainers.
- Not-found, not forbidden, is returned for foreign resources, so existence is not leaked.

### 5.2 Fake M-Pesa callback / forged payment confirmation
Attacker POSTs a crafted C2B confirmation to credit a rent balance.
- Controls in section 7: IP allowlist, secret path token, Transaction Status API re-verification before crediting, shortcode and amount checks, idempotency.
- Payments that fail re-verification land in a "unverified" queue and never touch the ledger.
- Alert on any callback from a non-allowlisted IP or with a bad token.

### 5.3 Caretaker fraud: fake cash payments
A caretaker records cash received that was never paid, or records cash and pockets it while marking something else.
- Cash payments are a distinct method; caretaker role can create a cash receipt but it posts as `pending_owner_approval` until the owner or manager approves (configurable threshold per org).
- Tenant gets an SMS receipt for every cash entry (with a "dispute" link); disputes flag the entry.
- Caretakers cannot edit or delete; reversal needs manager role plus reason and creates a reversing entry.
- Daily cash-in report per caretaker; anomaly flags (many round-sum cash entries, entries just before month-end, high reversal rate).
- Receipts are numbered sequentially per org with no gaps allowed; gaps alert.

### 5.4 Landlord ledger tampering (backdating, deleting evidence)
A landlord edits history to hide a refund, penalty dispute or deposit misuse, or a staff member alters balances.
- Append-only ledger enforced by DB permissions and triggers; corrections only by reversing entries.
- Backdating blocked beyond a closed period; closed periods need owner step-up and reason.
- Audit log hash chain (section 11) with periodic anchoring; tenants can obtain a signed statement with its hash.
- Daily job recomputes balances from entries and compares to cached balances; mismatch pages on-call.

### 5.5 SIM-swap account takeover
Attacker ports the victim's number and resets password or intercepts SMS OTP.
- Privileged roles use TOTP or passkeys, not SMS OTP, for 2FA. SMS OTP is allowed only as a low-privilege login factor for tenants.
- Password reset via phone alone is not allowed for roles with money or export access; reset requires email link plus TOTP, or recovery code.
- Changing phone, email or 2FA triggers a 24-hour cooling period during which payouts, exports and settings changes are blocked and notifications go to all old channels.
- Step-up auth on sensitive actions; session revocation on credential change.
- Recovery codes are shown once, stored hashed.

### 5.6 SMS spam and abuse
Using Kodibox to send unsolicited messages, or triggering OTP floods to harass a number.
- Message templates only; marketing requires recorded opt-in; every marketing SMS carries STOP; STOP honoured within minutes via inbound webhook.
- Per-org and per-number rate limits; global suppression list.
- OTP: max 3 per number per hour, progressive delay, CAPTCHA (Turnstile) after repeated requests.
- Org send volume anomaly alerts; accounts can be suspended by platform admin.

### 5.7 Enumeration of tenant phone numbers
Attacker probes login, reset, or tenant-portal registration to learn which numbers are registered.
- Uniform responses and timing for "account exists / does not exist"; OTP sent "if registered".
- Rate limits per IP and per target number; CAPTCHA after thresholds.
- Tenant search inside an org is scoped by RLS and requires auth; no public lookup endpoints.
- Paybill account references do not embed phone numbers or ID numbers; use short random unit codes.

### 5.8 Bulk export exfiltration
A malicious or compromised insider exports every tenant's data.
- Export requires step-up auth, `export:data` permission (owner/accountant by default), and a reason.
- Exports run as queued jobs, delivered via signed link valid 15 minutes, requiring the same session; the link is single-use.
- Exports mask national ID and KRA PIN unless the user holds `pii:reveal` and confirms; reveal volume is capped per day per user.
- Alert owners by email on every export; alert platform security on exports above a row threshold or atypical frequency.
- Watermark: each export includes a hidden per-export id traceable to the user.

### 5.9 Insider platform admin abuse
Kodibox staff reading or altering customer data.
- Least privilege; no standing production DB access; break-glass with two-person approval, time-boxed, fully logged to an external write-once log store.
- Admin panel cannot edit ledger or read decrypted PII; decryption needs KMS permission held by the application roles only, not humans.
- Quarterly access review; background checks and confidentiality agreements for staff **[LEGAL]**.
- Org owners can view the "support access log" for their org.

## 6. Mandatory controls checklist

Tick state is tracked in the ASVS spreadsheet. "Gate" indicates which pipeline stage enforces it.

### 6.1 Authentication (Better Auth)
- [ ] Passwords hashed with argon2id (m=64 MiB, t=3, p=1 minimum; tune to ~250 ms), unique salt, optional server-side pepper from KMS.
- [ ] Password policy: min 12 chars, breached-password check (HIBP k-anonymity), no composition rules, no forced rotation.
- [ ] TOTP 2FA **mandatory** for owner, manager and accountant roles; enrolment forced before first access to org data; passkeys/WebAuthn supported as an alternative.
- [ ] Caretaker and tenant: 2FA optional; tenants may use SMS OTP login.
- [ ] Step-up auth (re-enter TOTP/password within the last 10 minutes) for: payout/paybill settings, bank details, exports, role changes, 2FA/email/phone change, API keys, period close, bulk reversals.
- [ ] Rate limits: login 5 attempts per account per 15 min and 20 per IP per 15 min; OTP 3 per hour per number; reset 3 per hour per account. Redis-backed sliding window.
- [ ] Lockout: progressive (15 min, 1 h, 24 h) with owner/user notification; no permanent lockout via attacker-triggerable path; unlock via email and 2FA.
- [ ] Session: random 256-bit id, httpOnly, Secure, SameSite=Lax cookies, `__Host-` prefix; rotation on login, privilege change and step-up; idle timeout 30 min for privileged roles (12 h tenants), absolute 12 h / 30 d.
- [ ] Device/session list per user with revoke; revoke-all on password change.
- [ ] Login alerts for new device/location.
- [ ] Generic error messages; constant-time comparisons.

### 6.2 Authorization
- [ ] RBAC roles: owner, manager, accountant, caretaker, tenant, platform-admin; permissions as explicit strings.
- [ ] `can(user, action, resource)` in `packages/core/authz` called by every action, query and route; resource ownership (org, property assignment for caretakers, own lease for tenants) checked.
- [ ] Deny by default; unit tests for the whole role/action matrix; lint rule fails on actions without a `can()` call.
- [ ] Caretakers are scoped to assigned properties.

### 6.3 Row-Level Security
- [ ] Every tenant table has `organization_id`, `ENABLE` and `FORCE ROW LEVEL SECURITY`, policy `organization_id = current_setting('app.current_org_id')::uuid`.
- [ ] `app.current_org_id` set with `SET LOCAL` inside the request transaction; missing setting means zero rows (fail closed).
- [ ] App DB role is not owner and has no `BYPASSRLS`; migration role separate.
- [ ] CI test enumerates `information_schema` and fails if a table with `organization_id` lacks policies.

### 6.4 Input and output
- [ ] Zod validation at every boundary (forms, actions, API routes, webhooks, env, job payloads, file metadata); `.strict()` objects; max lengths.
- [ ] Output encoding: no `dangerouslySetInnerHTML` without sanitized (DOMPurify) review; CSV exports neutralize formula injection (prefix `'` for `= + - @`); PDF generation uses templates only.
- [ ] Parameterized queries only.
- [ ] Phone numbers normalized to E.164; amounts parsed to bigint minor units, never floats.

### 6.5 Browser protections
- [ ] CSP with per-request nonces and `strict-dynamic`; `default-src 'self'`; `object-src 'none'`; `base-uri 'none'`; `frame-ancestors 'none'`; report-to endpoint. No `unsafe-inline`/`unsafe-eval` in production.
- [ ] Headers: `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (disable camera, mic, geolocation unless needed), `Cross-Origin-Opener-Policy: same-origin`, `Cross-Origin-Resource-Policy: same-site`.
- [ ] CSRF: SameSite=Lax cookie, Next.js Server Action Origin/Host check, custom token for non-action mutating routes; no state change on GET.
- [ ] CORS: no wildcard; explicit origin list for the mobile/API.
- [ ] Clickjacking prevented by `frame-ancestors`.

### 6.6 SSRF and outbound calls
- [ ] All outbound HTTP goes through a single `safeFetch` in `packages/integrations`: https only, host allowlist for known providers, blocks private/loopback/link-local/metadata IPs after DNS resolution (and pins the resolved IP), no redirects to other hosts, timeouts, response size cap.
- [ ] No user-supplied URLs fetched (e.g. logo URLs, callback URLs); if ever needed, requires ADR.
- [ ] Cloud metadata service protected (IMDSv2 / hop limit 1).

### 6.7 File uploads (IDs, leases, receipts)
- [ ] Allowlist types: PDF, JPEG, PNG, HEIC (converted); magic-byte sniffing, never trust extension or `Content-Type`.
- [ ] Size limits: 10 MB per file for images, 20 MB for PDFs; count limits per entity.
- [ ] Antivirus scan (ClamAV) in quarantine bucket before release; files unusable until clean.
- [ ] Re-encode images (strip EXIF/GPS); reject PDFs with JavaScript/embedded files.
- [ ] Random object keys, private bucket, served only via short-lived signed URLs with `Content-Disposition: attachment` and `nosniff`; user filename never used in the path.
- [ ] Direct-to-storage presigned POST with enforced content-length-range and key prefix; the server verifies after upload.

### 6.8 Cryptography and key management
- [ ] TLS 1.2+ everywhere (1.3 preferred), modern ciphers, HSTS preload; internal service traffic over TLS; DB `sslmode=verify-full`.
- [ ] Envelope encryption for PII (national ID, KRA PIN, phone, raw webhook payloads, lease docs): AES-256-GCM data keys generated per org (DEK), wrapped by a KMS key (KEK) in AWS KMS or equivalent; DEK cached in memory with short TTL; ciphertext stores key id and version.
- [ ] Searchable fields (phone, ID number) use a keyed blind index (HMAC-SHA256 with a separate key) so lookups work without decrypting.
- [ ] Key rotation: KEK automatic annual rotation; DEK rotation yearly and on suspicion via a background re-encrypt job; rotation is tested in staging each quarter; compromised-key procedure documented in the incident runbook.
- [ ] No custom cryptography; use `node:crypto` or audited libraries; random from CSPRNG.
- [ ] Crypto-shredding: deleting an org's DEK (after retention) renders its backups unreadable.

### 6.9 Secrets management
- [ ] Env vars injected from a secrets manager (AWS Secrets Manager/SSM or Doppler); validated at boot by `packages/config/env.ts`; process exits on missing or malformed.
- [ ] Separate secrets per environment; Daraja consumer key/secret, passkey, SMS API key, DB creds rotated at least every 90 days and on staff departure.
- [ ] Per-org integration credentials (e.g. a landlord's Daraja keys, if stored) are encrypted with the org DEK.
- [ ] `.env*` git-ignored except `.env.example`.

### 6.10 Supply chain and pipeline scanning
- [ ] Dependencies: `pnpm audit --prod` fails CI on high/critical; Renovate with grouped weekly updates and automerge for patch-only dev deps; lockfile committed; `pnpm install --frozen-lockfile`; install scripts disabled by default (`ignore-scripts`, allowlist).
- [ ] Socket or Snyk on PRs for malicious/typosquatted packages and new install scripts.
- [ ] SAST: Semgrep (ruleset: typescript, nextjs, owasp-top-ten, custom rules for missing `can()`, raw SQL, `dangerouslySetInnerHTML`) and GitHub CodeQL on every PR; findings block merge at high.
- [ ] Secret scanning: gitleaks pre-commit hook plus CI job; GitHub secret scanning push protection enabled.
- [ ] Container scanning: Trivy on images (OS and libs) and on IaC; fail on critical with fix available; minimal distroless/slim base, non-root user, read-only filesystem.
- [ ] DAST: OWASP ZAP baseline scan against staging nightly and before each release; authenticated scan quarterly.
- [ ] SBOM (CycloneDX) generated per release; images signed (cosign) and provenance (SLSA) attested.
- [ ] GitHub Actions pinned by commit SHA; least-privilege `GITHUB_TOKEN`; protected branches, required reviews, signed commits for maintainers.

### 6.11 Infrastructure
- [ ] Private networking for DB, Redis; only the load balancer is public; WAF with rate limiting and bot rules in front of web.
- [ ] Least-privilege IAM; MFA on all cloud accounts; no long-lived keys on laptops.
- [ ] Production data never copied to dev/staging; seed data is synthetic.
- [ ] Infra as code reviewed; drift detection.

## 7. Webhook security (Daraja and banks)

Applies to M-Pesa C2B validation/confirmation, STK Push callbacks, B2C results (if ever), and bank callbacks.

1. **Source IP allowlist** at the edge (WAF/middleware) using Safaricom's published Daraja callback IPs, kept in config and reviewed whenever Safaricom updates them. Bank IP lists per integration. Take the client IP from the trusted proxy header only.
2. **Unguessable callback path token**: `/api/webhooks/mpesa/{orgOrShortcodeToken}/confirmation` where the token is 32+ random bytes, unique per registered shortcode/URL, stored hashed, rotatable. Wrong token returns the same 404 as unknown routes. (Daraja has no HMAC signature, so this plus IP allowlist plus re-verification is the trust model.)
3. **No sensitive words in URLs** registered with Daraja (e.g. avoid "mpesa", "safaricom" strings if Daraja rejects them); use neutral path names.
4. **Respond fast**: validate with Zod, store the raw payload encrypted in `webhook_events`, return the ResultCode 0 acknowledgement, process in the worker. Never do slow work inline.
5. **Idempotency on `TransID`**: unique index `(provider, trans_id)`; duplicate callbacks are acknowledged and ignored. Ledger posting uses the `TransID` as idempotency key too.
6. **Re-verify before crediting**: the worker calls the Transaction Status API (or the bank's query endpoint) for the `TransID` and compares amount, MSISDN hash, shortcode and status. Only a match is credited. Mismatch or API failure moves the event to retry/unverified, never to the ledger.
7. **Business checks**: `BusinessShortCode` must equal a shortcode registered to a known org; amount must be a positive integer within sane bounds; `TransTime` within an acceptable window; `BillRefNumber` mapped to a unit via server lookup (unmatched goes to the suspense/"unallocated" queue for manual allocation).
8. **Validation URL**: if C2B validation is enabled, return accept/reject based only on server-side data; never leak tenant data in the response.
9. **Rate and size limits**: 64 KB max body, per-IP and global limits sized for peak bursts.
10. **Monitoring**: alert on rejected-IP attempts, token failures, re-verification mismatches, duplicate-storm patterns, and gaps (no callbacks while STK pushes are active).
11. **Replay tooling**: stored raw payloads allow replay in staging with redaction; reconciliation job pulls Daraja statements/transaction history daily to catch missed callbacks.

## 8. Logging and redaction

- Structured JSON logs via OpenTelemetry; correlation ids; Sentry with `beforeSend` scrubbing.
- **Never log**: passwords, OTPs, session ids/tokens, API keys, full national ID, KRA PIN, full phone numbers, raw M-Pesa/bank payloads, document contents, Authorization or Cookie headers, DB connection strings.
- **Masking rules**: phone `+2547****5678` (last 4), national ID `****1234` (last 4), KRA PIN `A*******Z`, names logged only as ids, amounts allowed, account refs allowed. Emails: `j***@example.com`.
- Central `redact()` helper with a deny-list of keys (`password`, `token`, `secret`, `authorization`, `cookie`, `id_number`, `kra_pin`, `msisdn`, `phone`, `payload`); unit tested; logger wrapper applies it automatically; CI tests assert PII fixtures never appear in captured logs.
- Request bodies are not logged by default.
- Security events logged distinctly: login failure, lockout, 2FA change, step-up, permission denied, webhook rejection, export, PII reveal, admin access.
- Retention: application logs 1 year **[LEGAL]**; security/audit logs 1 year hot plus archive per section 12; access restricted to security and on-call roles.

## 9. Audit log tamper-evidence

- `audit_events` is append-only (no UPDATE/DELETE grants; triggers reject).
- **Hash chain**: each row stores `prev_hash` and `row_hash = SHA-256(prev_hash || canonical_json(row))` per organization (chain per org, plus a platform chain). Insert uses a per-org advisory lock to serialize.
- Daily job verifies chains; mismatch pages security. A daily Merkle root (or latest hash per org) is written to a separate write-once store (S3 Object Lock bucket in a different account) so database-level tampering is detectable.
- Ledger entries carry their own hash chain with the same scheme; statements printed or exported include the chain hash at generation time.
- Audit event content: actor, role, org, action, resource, before/after diff (PII fields hashed or masked), IP, user agent, trace id, reason, timestamp (UTC).
- Orgs can view and export their own audit trail.

## 10. Data classification and retention

Retention periods below are proposals; every row is **[LEGAL]** until confirmed.

| Class | Examples | Protection | Retention (proposed) |
|---|---|---|---|
| Restricted | National ID number and scans, KRA PIN, bank account numbers, DEKs, secrets | App-layer envelope encryption, masked, reveal audited, access by named roles | ID number/scan: delete 90 days after lease end unless legal hold or tax need **[LEGAL]**; KRA PIN: kept while needed for tax records, then with the financial record |
| Confidential | Phone, email, names, lease documents, payment records (M-Pesa raw payloads), statements | Encryption at rest, RLS, role-gated | Lease docs: 7 years after lease end (limitation period for contract claims) **[LEGAL]** |
| Financial records | Ledger entries, invoices, receipts, payments, eTIMS data | Append-only, hash-chained, backups | 7 years from end of the financial year (Tax Procedures Act 2015 s.23 record-keeping) **[LEGAL]** |
| Internal | Audit events, security logs, application logs | Restricted access, redacted | Audit events 7 years (they support financial records) **[LEGAL]**; app/security logs 1 year |
| Account data (Kodibox as controller) | Org users, billing, login metadata | Encrypted at rest, access-limited | Life of account plus 12 months; billing 7 years **[LEGAL]** |
| Marketing/consent | Consent records, opt-outs | Kept as proof | Life of consent plus 3 years **[LEGAL]** |
| Public | Marketing site content | None | n/a |

- Deletion is automated by a retention worker; each run is audited and produces a report. Where financial records must outlive PII, the tenant row is **pseudonymised** (name replaced by "Former tenant #id", ID/PIN/phone removed) while ledger rows remain.
- Legal hold flag blocks deletion and erasure for that tenant/lease and is itself audited.
- Backups age out within 35 days; erased data is not restored (restores re-apply a deletion ledger), and crypto-shredding covers org offboarding.

## 11. Backups and recovery

- Postgres: continuous WAL archiving (PITR) plus daily snapshots; retained 35 days; cross-region copy.
- Object storage: versioning, replication to a second region, Object Lock on lease/statement buckets.
- All backups encrypted (KMS), access restricted, separate account/credentials from production writers.
- **Restore drills**: quarterly full restore into an isolated environment, verifying RPO <= 15 min and RTO <= 4 h; record results; verify ledger hash chains and balances after restore. Failed drill is a sev-2 finding.
- Redis is treated as rebuildable; queued work is reconstructible from DB state and webhook_events.

## 12. Incident response runbook

**Severity:** Sev1 confirmed personal data breach, money integrity compromise or full outage; Sev2 suspected breach, partial outage, failed backup; Sev3 contained vuln or minor.

1. **Detect and declare** (any staff): page on-call via the incident channel; open an incident doc; name an Incident Commander (IC), a scribe and a comms lead. Record time of awareness (starts the 72-hour clock).
2. **Contain**: revoke sessions/tokens, rotate affected secrets and keys, disable affected integration or feature flag, block IPs, isolate hosts. Preserve evidence (snapshots, logs) before wiping anything.
3. **Assess**: what data, which orgs, how many data subjects, whether encrypted data keys were exposed, risk of harm (identity theft, fraud). Use audit logs and hash chains to determine scope. Decide if the Data Protection Act threshold is met.
4. **Notify (Data Protection Act 2019, s.43; Regulations 2021)** **[LEGAL]**:
   - Kodibox as processor notifies each affected controller (landlord org) **without delay**, and contractually within 24 hours of confirmation (set in the DPA).
   - The controller must notify the **ODPC within 72 hours** of becoming aware, where feasible; if later, give reasons. Kodibox prepares a pre-filled notification (nature of breach, categories and approximate numbers, likely consequences, measures taken, contact point) and offers to submit on the controller's behalf.
   - For breaches affecting Kodibox's own customer-account data, Kodibox is the controller and notifies ODPC within 72 hours.
   - **Data subjects** are notified **without undue delay** when there is a real risk of harm, in plain language by SMS/email, with what to do (e.g. watch M-Pesa, change passwords). Not required where data was encrypted and keys are safe (document the rationale).
   - Consider Safaricom, banks, and police (DCI) reporting where fraud is involved, and cyber incident reporting obligations under the Computer Misuse and Cybercrimes Act **[LEGAL]**.
5. **Eradicate and recover**: patch root cause, restore from clean backups if needed, verify ledger integrity (chain verification and balance recompute), staged return to service.
6. **Review**: blameless post-incident review within 5 business days; action items tracked; update threat model and tests. Keep the incident register (even for non-notifiable events) for ODPC inspection.
7. **Exercises**: tabletop exercise twice a year (webhook forgery, cross-org leak, insider).
8. **Contacts file** (kept outside the platform): ODPC, cloud provider, Safaricom Daraja support, Africa's Talking, legal counsel, cyber insurer, PR.

## 13. Vulnerability disclosure policy (summary)

Published at `/.well-known/security.txt` and in the repo root `SECURITY.md`.
- Report to security@kodibox.co.ke (placeholder; PGP key published). Acknowledge within 2 business days, triage within 5, fix targets: critical 7 days, high 30, medium 90.
- Safe harbour for good-faith research: no data exfiltration beyond proof, no social engineering of staff or tenants, no DoS, no testing against other orgs' real data (use the sandbox org).
- Credit in a hall of fame with consent. Bounty to be decided post-launch.
- Out of scope: third-party services (Safaricom, Africa's Talking), rate-limit nits, missing headers on non-sensitive static pages.
- Legal wording of safe harbour needs review **[LEGAL]** (Computer Misuse and Cybercrimes Act 2018).

## 14. Secure SDLC

- **Branching**: trunk with protected `main`; PRs require 1 approval, passing CI (lint, typecheck, tests, Semgrep, CodeQL, gitleaks, audit, Trivy).
- **PR template** (`.github/pull_request_template.md`) includes security and privacy checklist.
- **CODEOWNERS** requires the `security-reviewers` team for: `packages/core/authz/**`, `packages/core/ledger/**`, `packages/db/migrations/**`, `packages/db/rls/**`, `packages/integrations/mpesa/**`, `packages/integrations/banks/**`, `apps/web/src/app/api/webhooks/**`, `apps/web/src/middleware.ts`, auth config, `packages/config/**`, crypto/KMS helpers, upload handling, admin panel, CI workflows, `Dockerfile*`, `docs/SECURITY.md`. Agent assistance: the `security-reviewer` agent reviews diffs on these paths before human review; it does not replace the human owner.
- **Threat modelling**: any new feature touching money, PII or a new integration gets a short STRIDE note in the PR or ADR.
- **Testing**: security regression tests for each fixed vulnerability; cross-tenant tests; authz matrix tests; fuzz webhook parsers.
- **Training**: onboarding on this document; yearly refresh.
- **Environment hygiene**: preview deployments use synthetic data only and require auth.

## 15. Pre-launch and ongoing assurance

- **Independent penetration test is required before production launch** (and before any mobile release and yearly after): scope web, APIs, webhooks, tenancy isolation, admin panel, cloud config, mobile. All critical/high findings fixed and retested before go-live; report summary kept for ODPC/customer due-diligence.
- Pre-launch gate checklist: ASVS L2/L3 self-assessment complete, all CI scanners green, restore drill passed, incident runbook rehearsed, DPA template and privacy notice approved, ODPC registration done, DPIA signed off, KMS key rotation tested.
- Quarterly: access review, dependency/Renovate backlog, ZAP authenticated scan, restore drill.
- Bug bounty considered after 6 months of stable operation.

## 16. Open items for legal and leadership

1. Retention periods in section 10 (7-year tax records, ID scan deletion after lease end, log retention).
2. Exact breach-notification mechanics and processor-to-controller timing in DPA 2019 and the 2021 Regulations.
3. Safe-harbour wording in the disclosure policy.
4. Staff vetting and confidentiality terms for admin access.
5. Whether Kodibox must register as data processor and/or controller with the ODPC (see `docs/PRIVACY_BY_DESIGN.md`).
