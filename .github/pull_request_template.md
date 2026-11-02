## Summary

<!-- What and why. Link the milestone task / issue. -->

## Type

- [ ] feat - [ ] fix - [ ] refactor - [ ] docs - [ ] chore

## Testing

- [ ] Unit/integration tests added or updated
- [ ] `pnpm lint && pnpm typecheck && pnpm test` pass locally

## Security checklist (see docs/SECURITY.md)

- [ ] Every new/changed action, query or route calls `can(user, action, resource)` on the server
- [ ] New tenant-scoped tables have `organization_id` plus RLS policies in the same migration
- [ ] Cross-org access test added for new data access paths
- [ ] All inputs validated with Zod (forms, actions, API, webhooks, env, job payloads)
- [ ] No secrets, tokens or credentials committed; env vars added to `packages/config/env.ts` and `.env.example`
- [ ] No PII, tokens or raw M-Pesa/bank payloads in logs, errors, URLs or analytics
- [ ] Money uses integer minor units and goes through the ledger; no UPDATE/DELETE on ledger or audit tables
- [ ] State changes to money, leases, users/roles or settings write `audit_events`
- [ ] Webhook changes keep IP allowlist, path token, `TransID` idempotency and re-verification
- [ ] Outbound HTTP uses `safeFetch`; uploads are type-sniffed, size-limited and scanned
- [ ] Sensitive actions (payout, settings, export, role change) require step-up auth
- [ ] New dependencies reviewed (maintainer, install scripts, licence); `pnpm audit` clean
- [ ] N/A: this PR touches no auth, money, PII, webhook or infra code (explain below)

## Privacy checklist (see docs/PRIVACY_BY_DESIGN.md)

- [ ] Only the minimum personal data is collected; purpose and lawful basis noted
- [ ] New personal data fields have classification, retention and masking defined
- [ ] Encrypted at application layer where required (national ID, KRA PIN, phone) and masked in UI
- [ ] Consent captured and checked at send time for marketing/credit referencing; STOP honoured
- [ ] Data subject rights (export, rectify, erase, object) still work for the new data
- [ ] DPIA needed? (ID scans, credit referencing, profiling, new PII integration) - link or "not needed"
- [ ] N/A: this PR touches no personal data

## Notes for reviewers

<!-- Risk areas, ASVS requirement IDs satisfied, rollout/rollback plan. Paths in CODEOWNERS require security-reviewers approval. -->
