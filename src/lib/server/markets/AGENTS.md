# Markets Rules

## Scope

Applies to `src/lib/server/markets/**`. Use this subtree for market-time rules, FMP access, cache policy, storage invariants, and stable market-service facades.

For longer background, read [docs/architecture/markets.md](../../../docs/architecture/markets.md). For verification follow-ups, read [docs/agents/verification.md](../../../docs/agents/verification.md).

## Invariants

- All day-based cache keys and FMP date ranges must use `createMarketDateClock()` with `America/New_York`.
- Keep FMP access behind shared client helpers with timeout, retry, and structured `FmpRequestError` handling.
- Prefer stale-cache fallback over hard failure when a live refresh fails.
- Treat undefined-table errors as storage initialization failures and surface `pnpm markets:migrate` guidance.
- Keep provider access, cache policy, directory/search logic, and user storage logic in focused modules.
- Preserve `service.ts` as a stable facade when splitting implementation details.
- Do not seed the full symbol directory in the live search path.

## Verification Focus

- Run the repo verification matrix for substantial changes.
- Add `pnpm markets:capabilities` when FMP capability assumptions changed.
