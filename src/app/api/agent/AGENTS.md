# Agent API Rules

## Scope

This file applies to `src/app/api/agent/*`. Follow `src/app/api/AGENTS.md` first, then these streaming-specific rules.

## Invariants

- Keep the authenticated streaming contract stable for `/api/agent`.
- Preserve request-id, no-store, rate-limit, and timeout behavior when refactoring.
- Keep route orchestration thin; push provider-specific stream behavior into neighboring helpers.
- Return fallback stream events for timeout, empty-response, and provider-auth failures instead of leaving the client hanging.
- Preserve NDJSON event ordering so the client timeline keeps thread continuity.

## Coordination

- When the stream event shape or request contract changes, update `src/components/agent/*` in the same task.
- Keep remote MCP, prompt assembly, and model/provider orchestration on the server side.
- Reuse shared route helpers for headers and structured errors instead of inventing route-local variants.

## Verification

- Run the repo verification matrix.
- Smoke `/copilot` request/stream behavior when this subtree changes.
