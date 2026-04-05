# API Rules

## Scope

Applies to `src/app/api/**`. For the streaming agent route, also follow `src/app/api/agent/AGENTS.md`.

## Route Handler Discipline

- Keep route handlers thin: parse input, authenticate, call server modules, and shape the HTTP response.
- Use shared helpers for request ids, no-store headers, auth checks, and structured error responses.
- Preserve existing route URLs and payload shapes unless the task explicitly changes the public contract.
- If a route already returns machine-readable `code` + `error` fields, preserve that shape instead of inventing a new one.
- Avoid ad hoc headers or inline `NextResponse.json({ error: ... })` patterns when a shared helper already exists.

## Status Code Rules

- `400` for invalid input
- `401` for missing session
- `404` for real missing records
- `503` for unavailable storage or upstream dependencies
- `500` for unexpected failures

## Verification

- Update or run the relevant route tests under `src/app/api/**/__tests__` when handler behavior changes.
