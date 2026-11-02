---
name: secure-feature
description: Step-by-step workflow for building any Kodibox feature safely - schema and RLS, Zod schemas, can() authorization, Server Action returning Result, audit event, tests including cross-org access, then security review. Use at the start of every new feature, server action, API route, or job.
---
# Secure feature workflow

Follow in order. Do not skip a step; each maps to a CLAUDE.md rule. Related skills: `drizzle-rls` (step 1), `ledger-money` (money), `kenya-compliance` (PII/notifications).

1. **Schema + RLS first.** Add `organization_id` to every tenant table; ENABLE + FORCE RLS and policies in the same migration; indexes lead with `organization_id`. Run `db-migration-reviewer` if the schema changed.
2. **Zod schemas** in `features/<feature>/schemas`: `.strict()` objects, explicit max lengths, enums not free strings, IDs as branded UUIDs, phones normalised to E.164. Never accept `organizationId` or `userId` from the client; derive from the session.
3. **Authorization.** Add/extend the action in `packages/core/authz` and call `can(user, action, resource)` BEFORE any read or write. The resource includes org, property, unit, or lease so scope is enforced (a caretaker sees only assigned properties). Deny by default.
4. **Server Action returns `Result<T, AppError>`.** Template:
```ts
'use server';
export async function recordDeposit(raw: unknown): Promise<Result<DepositDto, AppError>> {
  const session = await requireSession();                    // 401 -> err('unauthenticated')
  const parsed = RecordDepositInput.safeParse(raw);
  if (!parsed.success) return err(validationError(parsed.error));
  const input = parsed.data;
  return withOrg(session.orgId, async (tx) => {              // sets app.current_org_id via SET LOCAL
    const lease = await leases.getById(tx, input.leaseId);   // RLS-scoped; null if other org
    if (!lease) return err(notFound());                      // same error as forbidden to avoid enumeration
    if (!can(session.user, 'deposit:record', { orgId: session.orgId, leaseId: lease.id, propertyId: lease.propertyId }))
      return err(forbidden());
    const posting = buildDepositPosting(input, lease);       // pure, packages/core
    await ledger.post(tx, posting);                          // idempotency key from input
    await audit.record(tx, { actor: session.user.id, action: 'deposit.recorded', before: null, after: posting.summary, ip: session.ip, ua: session.ua });
    return ok(toDto(posting));
  });
}
```
Never throw raw errors to the client; map unexpected errors to `AppError('internal')` and log with a correlation id and no PII.
5. **Audit event** for every state change to money, leases, users/roles, settings: actor, action, before/after diff (PII masked), IP, user agent. Written in the same transaction as the change.
6. **Logging & errors.** No PII, tokens, or M-Pesa payloads in logs. Mask phones as `+2547****1234`.
7. **Notifications / personal data?** Run through `kenya-compliance` triggers; add consent and retention handling.
8. **Tests** (Vitest + Testcontainers; delegate to `test-writer`):
   - happy path and validation failures;
   - each role allowed/denied;
   - **cross-org access test:** user of org A cannot read or mutate org B's record by ID (expects not-found, and zero rows without org context);
   - idempotency (double submit / webhook replay);
   - audit row written; ledger balanced if money moved.
9. **Verify:** `pnpm lint && pnpm typecheck && pnpm test` (scoped).
10. **Review:** invoke `security-reviewer` for anything touching auth, money, PII, webhooks, or migrations (`/review-sensitive` does this plus compliance).

## Quick red flags
Client-supplied org/user IDs; queries outside `withOrg`; `UPDATE`/`DELETE` on ledger tables; `parseFloat` on money; `console.log(payload)`; secrets in code or fixtures; UI-only permission checks; webhook handlers doing heavy work inline; missing `.strict()` on Zod objects.
