# API Rules

- Keep route handlers small: parse input, authenticate, call server modules, shape HTTP response.
- Use shared helpers for request ids, no-store headers, auth checks, and structured error payloads.
- Return machine-readable `code` + `error` fields for failures.
- Use `400` for invalid input, `401` for missing session, `404` for real missing records, `503` for unavailable storage or upstream dependencies, and `500` for unexpected failures.
- Avoid ad hoc headers or inline `NextResponse.json({ error: ... })` patterns when a shared helper already exists.
- Preserve current route URLs and payload shapes unless the task explicitly changes the public contract.
