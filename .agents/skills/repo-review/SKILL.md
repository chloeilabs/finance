---
name: repo-review
description: Use when reviewing or finishing changes in this repo and you need the standard Yurie Markets verification and review pass. Do not use for implementation-only work when no review or final verification is requested. Expected output: prioritized findings first if any exist, then the exact verification commands run or blocked.
metadata:
  short-description: Repo review and verification pass
---

# Repo Review

Use this skill for final review, stabilization passes, or when a task asks whether the repo change is safe to ship.

## Use When

- the user asks for a review
- the task is complete and needs the repo-standard verification pass
- a refactor changed multiple modules and needs a contract check

## Do Not Use When

- the task is still in active implementation and no review is requested
- the work is exploratory and not yet ready for verification

## Workflow

1. Read [docs/agents/code-review.md](../../../docs/agents/code-review.md) and [docs/agents/verification.md](../../../docs/agents/verification.md).
2. Review findings first, ordered by severity and contract risk.
3. Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

4. Add scoped checks when the touched area requires them.

## Expected Output

- findings first with file references when issues exist
- explicit statement when no findings were found
- exact verification commands run and any blocked checks
