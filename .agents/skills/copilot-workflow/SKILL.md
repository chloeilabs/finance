---
name: copilot-workflow
description: Use when working on the `/copilot` experience in this repo, including `src/components/agent`, `src/app/copilot`, or `src/app/api/agent`. Do not use for market-only pages or provider/storage work unrelated to agent streaming. Expected output: code changes plus focused `/copilot` verification covering thread interactions and streaming behavior.
metadata:
  short-description: Repo workflow for copilot features
---

# Copilot Workflow

Use this skill for changes to agent UI state, streaming behavior, thread interactions, or the authenticated agent route.

## Use When

- the task changes `src/components/agent/*`
- the task changes `src/app/api/agent/route.ts`
- the task changes `/copilot` page behavior, model selection, or stream timelines

## Do Not Use When

- the task is market-only
- the task is generic styling or infrastructure work unrelated to agent flows

## Workflow

1. Read the nearest copilot AGENTS files for the touched code:
   - `src/components/agent/AGENTS.md` for UI/thread-state work
   - `src/app/api/agent/AGENTS.md` for streaming route work
   Then read [docs/architecture/copilot.md](../../../docs/architecture/copilot.md).
2. Prefer extracting pure helpers from large client files instead of expanding hook/component files further.
3. Keep server-only prompt, auth, and rate-limit logic out of client modules.
4. Preserve thread rename/pin/delete/search behavior while refactoring.
5. Verify the full repo matrix and smoke `/copilot` interactions when affected.

## Expected Output

- summary of the user-visible `/copilot` impact
- note whether stream-state, route, or thread behavior changed
- exact verification commands run
