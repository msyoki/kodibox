# Kodibox Mobile App Plan

> Status: Draft v1 · 2026-11-02 · Scope: `apps/mobile` (Expo / React Native, TypeScript)
> Related: `docs/PROJECT_PLAN.md` (Phase 2 M2-01/M2-02, Phase 3 M3-01, M3-08), `docs/ARCHITECTURE.md` §12, `docs/SECURITY.md` §4.9 and §6

## 1. Goals
- Give tenants a 2-tap "pay rent" experience (STK Push) with receipts and statements on their phone.
- Give caretakers a field tool that works with no signal: meter readings, cash entries, inspections, jobs.
- Give owners and managers an "on the go" console: approve, reconcile, nudge, and see alerts.
- Stay light: run well on low-end Android and 3G, minimal data use.
- Follow every product rule: Kodibox never holds money, all money changes are audited and reversible, 2FA for owners/managers, no eviction or lockout features.

Non-goals: full back-office (invoicing runs, lease authoring, reports) stays on web; no in-app money movement beyond triggering STK Push through the backend.

## 2. One app, role-based experiences (decision)
**Decision: ship one Expo app with three role experiences (tenant, caretaker, manager/landlord), not three apps.**

Justification:
1. One codebase, one design system, one release train. The team is 1 mobile engineer (PROJECT_PLAN §7); three apps triple store listings, reviews, CI and support.
2. Roles overlap: an owner may also be a tenant elsewhere, and a caretaker may rent a unit. One login can hold multiple memberships with a role switcher.
3. Role is decided by the server (`can()`), the app only renders the matching navigator. Hiding UI is not access control.
4. Shared code (auth, API client, offline outbox, camera, i18n) is the bulk of the work.
5. Cost: a larger bundle. Mitigated by Expo Router lazy route groups, Hermes, and per-role code in separate route groups so unused screens are not loaded at startup. Target APK stays under 30 MB.

Revisit (via ADR) only if the store review process or APK size forces a split.

## 3. Screen inventory
Design frames live in the design project; filenames are `*.dc.html`.

### 3.1 Shared
| Screen | Frame | Notes |
|---|---|---|
| Login, OTP, 2FA, biometric unlock, role switcher | `AppLogin` | Phone + OTP for tenants/caretakers; password + TOTP for owners/managers |

### 3.2 Tenant (tabs: Home, Payments, Requests, Profile)
| Screen | Frame | Notes |
|---|---|---|
| Home (amount due, quick actions, receipts) | `TenantHome` | Single balance card, Pay with M-Pesa |
| Pay (STK Push prompt, status) | `TenantPay` | Backend initiates STK; app only waits for result |
| Receipt | `TenantReceipt` | Shareable PDF, M-Pesa code |
| Statement | `TenantStatement` | Payments tab; current statement only cached |
| Maintenance requests | `TenantRequest` | Photos, status timeline |
| Notices | `TenantNotices` | Vacation and rent-increase notices (templates only) |
| Profile, consents, data export and correction requests | `TenantProfile` | DPA rights entry points |

### 3.3 Caretaker (tabs: Tasks, Readings, Cash, Jobs), offline-first
| Screen | Frame | Notes |
|---|---|---|
| Today's tasks and sync status | `CaretakerHome` | Outbox count, Sync now |
| Water readings (photo required) | `Caretaker` | Per-unit entry, anomaly hint |
| Record cash payment, my entries | `CaretakerCash` | Receipt book no. + photo, pending until manager approves |
| Move-out inspection | `CaretakerInspection` | Room checklist, final reading, keys, signature |
| Job / work order | `CaretakerJob` | Cost, receipt photo, mark done, tenant notified |

### 3.4 Manager / landlord (tabs: Home, Approvals, Tenants, Alerts)
| Screen | Frame | Notes |
|---|---|---|
| Home (collected vs expected, quick actions, attention list, property switcher) | `ManagerHome` | Read-mostly dashboard |
| Approvals (cash, unmatched M-Pesa, flagged readings) | `ManagerApprovals` | Biometric/2FA step-up on every approve |
| Tenant search and quick card | `ManagerTenant` | Call, SMS, STK request, statement |
| Alerts inbox | `ManagerAlerts` | Payments, failed SMS, lease ending, MRI due, security alerts |

## 4. Technology
| Concern | Choice |
|---|---|
| Framework | Expo SDK (current stable), React Native with Hermes, TypeScript strict |
| Navigation | Expo Router (file-based), route groups `(tenant)`, `(caretaker)`, `(manager)`, `(auth)` |
| Server state | TanStack Query (cache, retry, background refetch) with persisted cache limited to non-PII lists |
| API | REST `/api/v1` with the OpenAPI 3.1 document generated from Zod; typed client via `openapi-typescript`, plus a small fetch wrapper |
| Validation | Zod at every boundary (API responses, forms, deep links, push payloads) |
| Tokens | `expo-secure-store` (Keychain / Keystore) |
| Biometrics | `expo-local-authentication` for unlock and step-up |
| Local DB | `expo-sqlite` for the caretaker outbox and cached task lists |
| Media | `expo-camera` / `expo-image-picker`, `expo-image-manipulator` for compression |
| Push | Expo Notifications over FCM (Android) and APNs (iOS) |
| i18n | `i18next` with English and Kiswahili, KES and `Africa/Nairobi` formatting (ties to M3-08) |
| Monitoring | Sentry (PII scrubbed), basic product analytics without personal identifiers |

Shared code: Zod schemas and money/date helpers come from workspace packages; the mobile app never imports `packages/db` or server-only code.

### 4.1 Offline-first (caretaker)
- Every write (reading, cash entry, inspection, job update) is stored in a SQLite **outbox** row: `id`, `type`, `payload`, `attachments`, `idempotency_key` (UUIDv4 generated on the device), `created_at`, `status`.
- A sync worker drains the outbox on connectivity or app foreground, in order per entity, with exponential backoff. The server stores the key and returns the original result on replay, so retries never double-post.
- Attachments upload separately via signed URLs (resumable, small chunks), then the outbox item references the object key.
- **Conflict rules:** server is the source of truth for money. Readings: first accepted reading per meter and period wins; a later conflicting one becomes a "review" flag for the manager, never an overwrite. Cash entries: always created as `pending`, cannot conflict. Inspections: append-only per move-out; a second submission supersedes only if the first is still a draft. Job status: monotonic (cannot move backwards); costs are additive entries.
- Rejected items surface in the app with the reason and an edit-and-resubmit action. Nothing is silently dropped.
- Outbox items that hold PII are cleared after a successful sync; the cache keeps only the task lists and unit codes needed offline.

### 4.2 Camera and media
- Compress to max 1600 px long edge, JPEG quality about 70 (target 150-300 KB per photo).
- **Strip EXIF** (GPS, device) before upload; the server records capture time and uploader itself.
- Uploads are scanned and re-encoded server-side (SECURITY §6.7). No photo goes to the device gallery by default.

### 4.3 Push notifications
- Registered per device after login; token stored server-side and revoked on logout or session revoke.
- **No PII in push payloads**: titles like "Payment received" or "New request", with an opaque id. Details load after authentication. Lock-screen preview shows no names, amounts or unit codes.
- Notification preferences per category; SMS stays the fallback for tenants without data.

### 4.4 Low-end and data-light targets
- Android first: min SDK per Expo default, test on 2 GB RAM devices (e.g. Tecno, Infinix, Samsung A-series).
- APK / AAB download under 30 MB (Hermes, R8 shrink, split ABIs, no unused fonts; Manrope and Plex Mono subset or system fallback).
- Works on 3G: paginated lists, gzip/brotli, ETag caching, image thumbnails, no auto-play media, skeleton screens, request timeouts of 20 s with retry.
- Offline reads for the last-synced screen state; clear "last synced" labels.

## 5. Security
Aligned with `docs/SECURITY.md` §4.9 and §6.1.
- **Auth:** short-lived access token (about 15 min) plus **rotating refresh token** (single-use, reuse detection revokes the family). Better Auth bearer sessions under `/api/v1`.
- **Device binding:** refresh token tied to a device id and key generated at first login; new device login triggers OTP and a notification to the user ("new sign-in" alert, see `ManagerAlerts`). Sessions are listed and revocable remotely.
- **Biometric:** unlock after backgrounding; **step-up (biometric or TOTP)** for approvals, STK requests from the manager console, exports and viewing full statements.
- **Storage:** tokens only in `expo-secure-store`; no PII in AsyncStorage; app-switcher masking and backup exclusion.
- **Transport:** TLS 1.2+, **certificate pinning for the API domain** as a considered control (pin to intermediate/SPKI with backup pins and a rotation plan; kill switch via remote config so a bad pin cannot brick the app). Decide in an ADR before MA-10.
- **Device integrity:** root/jailbreak and emulator signals, plus Play Integrity / App Attest for high-risk endpoints. Treated as a **risk signal** (extra step-up, flagged session), not a hard block, to avoid locking out legitimate low-end devices.
- **Screenshot blocking** (`FLAG_SECURE`, iOS blur on app switch) on sensitive screens: login/OTP, approvals, tenant card, statements, signature capture.
- **No secrets in the bundle:** only the public API base URL and public client identifiers. All third-party keys (Daraja, SMS, storage) stay on the server.
- **OTA updates:** EAS Update with **code signing enabled**, staged rollouts, instant rollback, and JS-only changes; anything touching native modules, permissions or auth requires a store release. Runtime version pinned to the native build.
- Server enforces everything: rate limits, `can()`, RLS and audit events are identical to web.

## 6. Privacy (DPA 2019)
- Consents (privacy notice, SMS/push preferences, camera/photo use) captured in-app at first run and logged server-side with version and timestamp.
- **Permission rationale screens** before the OS prompt for camera, notifications, contacts (not requested) and biometrics; ask just-in-time, never at launch. If denied, a graceful fallback.
- Data minimisation: no location, no contacts, no advertising IDs, no third-party trackers.
- Tenant rights (export, correction, erasure request) reachable from `TenantProfile`.
- Store "Data safety" (Google) and "App Privacy" (Apple) declarations kept in sync with this plan; reviewed by `compliance-reviewer` each release.
- Retention follows `docs/SECURITY.md` §10; device caches are wiped on logout.

## 7. Payments
- STK Push is initiated **only by the backend** (`POST /api/v1/payments/stk`); the app sends the invoice id and shows a pending state, then polls or receives a push for the result.
- The app **never collects, sees or stores the M-Pesa PIN**; the PIN is entered on the Safaricom prompt on the tenant's phone.
- Display paybill/account fallback (`[PAYBILL]`, unit code) for tenants who prefer to pay manually.
- Idempotency key on every STK request; duplicates within a window return the existing request.
- Caretaker cash entries are maker-checker: pending until a manager approves with step-up. Rejections are visible with a reason.
- No card entry, no wallet, no money held by Kodibox (CLAUDE.md rule 2).

## 8. Release
- **Build:** EAS Build (development, preview, production profiles), versioning via EAS app version source, reproducible lockfile, secrets in EAS environment variables (server-side only).
- **Order:** Google Play first (Kenya market is Android-dominant), then the App Store.
- **Tracks:** internal testing (team) -> closed beta (pilot landlords, caretakers, tenants) -> production with staged rollout (5%, 20%, 50%, 100%).
- **Store compliance:** Play Data safety form, Apple privacy labels, privacy policy URL, account deletion path in-app and on web, demo account with test data for reviewers, Kiswahili listing text.
- **Distribution fallback:** signed APK download from the trust page for devices without Play, after the pentest.
- Release gates: tests green, `security-reviewer` run on auth/payment changes, crash-free baseline met in beta.

## 9. Testing
- **Unit / component:** Jest with React Native Testing Library; outbox, conflict rules and money formatting have high coverage.
- **API contract:** generated client compiled against the OpenAPI document in CI; breaking changes fail the build.
- **E2E:** Maestro flows (login, pay, offline reading then sync, cash approval, step-up) on CI emulators; Detox only if Maestro cannot cover a native case.
- **Offline tests:** airplane-mode scenarios, killed app mid-sync, duplicate replay with the same idempotency key.
- **Device matrix:** low (2 GB, Android 10), mid (4 GB, Android 12-13), high (Android 14), plus iPhone SE and a recent iPhone; throttled 3G profile.
- **Security:** MobSF static scan, dependency audit, pinning and rooted-device checks in pentest H-01.
- **Accessibility:** touch targets at least 44 px, contrast 4.5:1, TalkBack and VoiceOver pass, font scaling to 200%.

## 10. Milestones
Phase 2 delivers a mobile-friendly **PWA** first (cheaper to validate, no store dependency):
- M2-01 Tenant portal (PWA): login by phone + OTP, invoices, statements, STK pay, receipts. Its API routes (`/api/v1`) and designs are reused by the app.
- M2-02 Caretaker app view (PWA, offline-capable readings and checklists): proves the outbox and idempotency design before native.

Phase 3 **M3-01 Native mobile app (Expo)** is split into sub-tasks, one PR each:
- [ ] MA-01 Scaffold `apps/mobile`: Expo, Expo Router, TypeScript strict, workspace packages, lint, CI build, EAS project.
- [ ] MA-02 API client: OpenAPI-generated types, fetch wrapper, TanStack Query setup, Zod response validation, error model.
- [ ] MA-03 Auth: `AppLogin`, OTP, TOTP, token storage in secure-store, rotating refresh, device binding, remote revoke.
- [ ] MA-04 Biometric unlock and step-up, app-switcher masking, screenshot blocking, role switcher.
- [ ] MA-05 Tenant core: `TenantHome`, `TenantPay` (STK via backend), `TenantReceipt`, `TenantStatement`.
- [ ] MA-06 Tenant extras: `TenantRequest` (photos), `TenantNotices`, `TenantProfile` (consents, data requests).
- [ ] MA-07 Offline engine: SQLite outbox, idempotency keys, sync worker, conflict rules, attachment upload, sync status UI.
- [ ] MA-08 Caretaker screens: `CaretakerHome`, `Caretaker` (readings), `CaretakerCash`, `CaretakerInspection`, `CaretakerJob`.
- [ ] MA-09 Manager screens: `ManagerHome`, `ManagerApprovals`, `ManagerTenant`, `ManagerAlerts` with step-up on approvals.
- [ ] MA-10 Push notifications (Expo Notifications, FCM/APNs), no-PII payloads, preferences; certificate pinning ADR and implementation.
- [ ] MA-11 i18n English/Kiswahili (aligns with M3-08), low-end and 3G optimisation pass, bundle-size budget in CI.
- [ ] MA-12 Hardening and release: Maestro e2e, device matrix, pentest fixes (H-01), store forms, EAS Update signing, closed beta then production on Play, then App Store.

Rough timing: MA-01 to MA-04 in weeks 20-22, MA-05 to MA-09 in weeks 23-27, MA-10 to MA-12 in weeks 27-30, overlapping Phase 4.

## 11. Metrics
| Metric | Target |
|---|---|
| Crash-free sessions | at least 99.5% (Sentry) |
| Cold start on mid-range Android | under 3 s |
| APK / AAB download size | under 30 MB |
| Offline sync success without manual retry | at least 98% |
| STK Push success to receipt shown | median under 30 s |
| Share of tenants paying via app (6 months post launch) | track, set target after beta |
| Cash entries approved or rejected within 24 h | at least 90% |
| Store rating | at least 4.2 |

## 12. Open questions
- Certificate pinning vs. operational risk of rotation (ADR before MA-10).
- Whether to require Play Integrity for all manager approvals or only above a KES threshold.
- WhatsApp opt-in flows (M3-02) reusing push preferences.
- Whether landlords of agencies (read-only portal) get a fourth role group in the app or stay web-only at launch.
