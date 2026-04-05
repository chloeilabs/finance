# Copilot Rules

## Scope

This file applies to `src/components/agent/*`. For `/copilot` route handlers, also read `src/app/api/agent/AGENTS.md`. For longer background, read `docs/architecture/copilot.md`.

## Invariants

- Keep `/copilot` route behavior stable while refactoring.
- Preserve client/server boundaries: UI state stays in client modules, while prompt, model, tool, and auth orchestration stays server-side.
- Keep thread persistence separate from transient stream state so switching, renaming, pinning, deleting, and search stay durable.
- Streaming code must tolerate partial events, retries, and empty states without losing thread history or corrupting the visible timeline.
- Reuse shared thread/model types from narrow imports instead of broad repo barrels.

## File-Shaping Preferences

- Extract pure stream-state or thread-state helpers before growing large React hooks/components further.
- Keep browser storage, request helpers, and stream reducers in focused modules rather than folding them back into top-level UI components.

## Verification Focus

- Smoke `/copilot` when this subtree changes.
- Verify thread switching plus rename/pin/delete behavior when touching thread state.
- Verify the rendered timeline still handles text, reasoning, tools, and empty/error states when touching streaming code.
