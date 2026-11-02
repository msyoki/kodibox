---
description: Pick the next unchecked task in docs/PROJECT_PLAN.md and delegate it to feature-builder
argument-hint: "[optional task id or keyword to pick a specific task]"
allowed-tools: Read, Grep, Glob, Agent, Edit
---
1. Grep docs/PROJECT_PLAN.md for unchecked items (`- [ ]`). If `$ARGUMENTS` is given, pick the matching task; otherwise pick the first unchecked task whose dependencies are done. Read only the surrounding lines of that milestone.
2. State the chosen task in one sentence plus its acceptance criteria. If it is large or ambiguous, propose a short plan and wait for confirmation.
3. Delegate to the `feature-builder` subagent with: the task text, relevant doc section pointers (not contents), and the skills to load. Ask it for a diff summary.
4. If the task touches auth, money, PII, webhooks, or migrations, run `/review-sensitive` next.
5. After tests pass, tick the checkbox in docs/PROJECT_PLAN.md and suggest a Conventional Commit message. Do not commit unless asked.
