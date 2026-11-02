# 0001. Record architecture decisions

- Status: Accepted
- Date: 2026-11-02

## Context
Kodibox handles money and personal data under Kenyan law. Design choices (stack, ledger, tenancy, fund flow) have legal and security consequences and must stay traceable. `CLAUDE.md` fixes the stack and says changes happen only via an ADR. New contributors (and AI agents) need the reasoning, not only the result.

## Decision
We record each significant architectural decision as a short ADR in `docs/adr/`, using Michael Nygard's format (Context, Decision, Consequences) plus Status and Date.

- Files are named `NNNN-kebab-title.md`, numbered sequentially, never renumbered.
- Statuses: Proposed, Accepted, Deprecated, Superseded by NNNN. Accepted ADRs are not edited except for status; changes are new ADRs that supersede.
- An ADR is required to: change anything in the `CLAUDE.md` tech stack; add a path where money touches a Kodibox account; change the tenancy or ledger model; add a new data store or third-party processor of personal data; relax a non-negotiable rule.
- ADRs are reviewed in the same PR as the code they justify. Money, PII or fund-flow ADRs also need security and compliance review.
- Keep each to roughly one page.

## Consequences
- Decisions and trade-offs are discoverable and reviewable; onboarding is faster.
- Small overhead per significant change; trivial choices do not need ADRs.
- The log forms evidence of due diligence for regulators and enterprise customers.
