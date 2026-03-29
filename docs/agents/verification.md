# Verification

## Full Matrix

Run these before closing a substantial change:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Market Changes

Run the full matrix, then also check:

```bash
pnpm markets:migrate
pnpm markets:capabilities
```

Use these when market storage, FMP capability assumptions, cache semantics, or route error contracts change.

When FMP capability assumptions changed and you need to persist the live plan snapshot, also run:

```bash
pnpm markets:capabilities:write
```

## Copilot Changes

Run the full matrix and smoke the `/copilot` path:

- verify model loading
- verify thread list interactions
- verify streaming fallback behavior if the task touched `src/app/api/agent` or `src/components/agent`

## Review Standard

- prefer updated tests over manual-only confidence
- preserve route contracts unless explicitly changed
- call out any skipped verification with a concrete blocker
