---
description: Run security-reviewer and compliance-reviewer (and db-migration-reviewer if needed) on the current diff
argument-hint: "[optional paths or focus area]"
allowed-tools: Bash(git diff:*), Bash(git status:*), Bash(git log:*), Agent, Read, Grep
---
Current changes: !`git status --short`

Review scope: $ARGUMENTS (default: the whole working diff).

Launch in parallel, each with the diff scope in the prompt:
1. `security-reviewer` subagent.
2. `compliance-reviewer` subagent.
3. `db-migration-reviewer` subagent, only if files under packages/db changed.

Then merge the results into one list ordered by severity, deduplicated, with file:line and the fix. Finish with a single verdict (BLOCK / FIX-BEFORE-MERGE / OK). Do not edit code; ask whether to hand fixes to `feature-builder`.
