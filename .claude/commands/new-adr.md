---
description: Create the next numbered ADR in docs/adr/ from a title and context
argument-hint: "<decision title and short context>"
allowed-tools: Read, Glob, Grep, Write
---
Create a new Architecture Decision Record for: $ARGUMENTS

1. Glob `docs/adr/*.md`; next number = highest NNNN + 1 (start at 0001), zero-padded to 4 digits.
2. File: `docs/adr/NNNN-kebab-case-title.md`. Sections: Title, Status (Proposed), Date (today), Context, Decision, Consequences (positive and negative), Alternatives considered, Links (related docs/ADRs).
3. If the decision changes the stack in CLAUDE.md, routes money, or affects personal data, add a "Compliance impact" section and note that a legal review is required.
4. Keep it under 60 lines, no invented facts; if context is missing, ask one concise question first.
5. Report the path created. Do not edit CLAUDE.md; tell the user if it needs a manual update.
