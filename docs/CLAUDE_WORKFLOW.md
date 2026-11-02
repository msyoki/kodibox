# Claude Code Workflow for Kodibox

How to use the project's Claude Code setup (`.claude/`) efficiently. CLAUDE.md is the contract; this file is the operating manual.

## What is in `.claude/`
| Item | Purpose |
|---|---|
| `settings.json` | Allow-list for lint/test/typecheck/build/migrate and read-only git; denies `.env*` (except `.env.example`), secrets dirs, `rm -rf`, force push, `curl`/`wget`. Registers the guard hook |
| `hooks/guard.mjs` | PreToolUse on Edit/Write/MultiEdit. Blocks (exit 2) content with likely secrets (Daraja key/secret/passkey, private keys, `sk_live`, AWS keys). Warns when a migration creates a table without `ENABLE ROW LEVEL SECURITY` |
| `agents/` | codebase-scout, feature-builder, test-writer, security-reviewer, compliance-reviewer, docs-writer, db-migration-reviewer |
| `skills/` | mpesa-daraja, ledger-money, kenya-compliance, secure-feature, drizzle-rls (each with a short SKILL.md and on-demand reference files) |
| `commands/` | `/next-task`, `/review-sensitive`, `/new-adr` |

## Daily loop
1. `/next-task` picks the next unchecked item in `docs/PROJECT_PLAN.md` and hands it to `feature-builder` (Sonnet), which loads the right skills, implements, tests, and reports a diff summary.
2. Ask `test-writer` for extra coverage (cross-org, idempotency, property tests) if the builder's tests are thin.
3. For auth, money, PII, webhooks, or migrations run `/review-sensitive` (security-reviewer on Opus, compliance-reviewer, and db-migration-reviewer when `packages/db` changed). Fix findings, re-run.
4. Ask `docs-writer` to tick the plan, update the changelog, and write ADRs (`/new-adr "title and context"`) for stack or money-flow decisions.
5. Commit with Conventional Commits (`feat(billing): ...`).

## Which model for what
| Work | Agent / model | Why |
|---|---|---|
| Find files, usages, patterns | codebase-scout / Haiku | Cheapest; returns paths and summaries only |
| Implement a scoped task, write tests | feature-builder, test-writer / Sonnet | Best cost-to-quality for code |
| Docs, ADRs, changelog | docs-writer / Haiku | Mechanical edits |
| Compliance, migration review | Sonnet | Checklist-driven |
| Security review of sensitive diffs | security-reviewer / Opus | Subtle bugs (IDOR, ledger invariants) justify the cost; run once per sensitive change, not per edit |
| Architecture, hard debugging | Main session on Opus, in plan mode | Only when needed |

## Token-saving playbook
- Delegate searches: "use codebase-scout to find where payments are reconciled" beats reading ten files in the main context.
- Subagents keep their exploration out of your main context; ask for summaries, never whole files.
- Keep CLAUDE.md lean (it loads every turn). Put long reference in skills (loaded on demand) or `docs/` (read via Grep + offset/limit).
- Name the skill you need ("use the ledger-money skill") instead of pasting rules.
- `/clear` between milestones or unrelated tasks; `/compact` with a focus note when a session must continue. Do not carry a finished feature's history into the next one.
- Use plan mode (Shift+Tab or `/plan`) for features touching more than 3 modules: agree the plan cheaply, then execute with `feature-builder`.
- One task per session slice: small, testable, tick the checkbox, move on.
- Scope test runs (`pnpm --filter @kodibox/core test`) and lint before the full suite.
- Avoid re-reading files you just edited; trust tool results.
- Use `/cost` (or `/context`) occasionally to spot context bloat; switch model with `/model` for the task at hand.

## Safety nets
- The guard hook is a backstop, not a scanner replacement; also run gitleaks or secret scanning in CI.
- Deny rules stop Claude reading `.env*`; keep real credentials out of the repo directory where possible.
- Never approve `git push --force`, `rm -rf`, or production `curl` requests; they are denied on purpose.
- Edit `.claude/settings.local.json` (gitignored) for personal permission tweaks, not the shared file.

## Optional plugins and MCP servers
Install commands change; mark every one "verify against current docs" (`claude mcp add --help`, https://docs.claude.com/en/docs/claude-code/mcp). Prefer project scope (`-s project` writes `.mcp.json`) only for servers the whole team should use, and never put tokens in committed files; use env vars.

| Server | Use | Example (verify against current docs) |
|---|---|---|
| GitHub MCP | PRs, issues, review comments | `claude mcp add --transport http github https://api.githubcopilot.com/mcp/ --header "Authorization: Bearer $GITHUB_PAT"` |
| Postgres MCP (read-only, LOCAL dev DB only) | Inspect schema, test RLS queries | `claude mcp add postgres -- npx -y @modelcontextprotocol/server-postgres postgresql://readonly:readonly@localhost:5432/kodibox_dev` (use a read-only role; never point at staging or production) |
| Playwright MCP | Drive the browser for e2e debugging | `claude mcp add playwright -- npx -y @playwright/mcp@latest` |
| Sentry MCP | Read production errors (PII already scrubbed) | `claude mcp add --transport http sentry https://mcp.sentry.dev/mcp` (OAuth in `/mcp`) |
| Context7 (optional) | Up-to-date library docs (Drizzle, Better Auth, Next.js) | `claude mcp add context7 -- npx -y @upstash/context7-mcp` |

Each MCP server adds tool definitions to context, so enable only what the current task needs and remove the rest (`claude mcp remove <name>`). Optional marketplace plugins (verify names): a semgrep or security-guidance plugin to complement security-reviewer, and a frontend-design plugin for UI work.

## Keeping this setup healthy
- When a rule in CLAUDE.md changes, update the matching skill and reviewer checklist in the same commit.
- Review `settings.json` allow-list every milestone; add commands you approve repeatedly (`/fewer-permission-prompts` helps).
- Verify Daraja endpoints, tax rates, and legal figures against current official sources; skills point to docs rather than duplicating figures.
