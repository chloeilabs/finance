# Markets Rules

- All daily cache keys and FMP date ranges must use `createMarketDateClock()` and `America/New_York`.
- Keep FMP access behind shared client helpers with timeout, retry, and structured `FmpRequestError` handling.
- Prefer stale-cache fallback over hard failure for market pages when live refresh fails.
- Treat undefined-table errors as storage initialization failures and surface `pnpm markets:migrate` guidance.
- Keep provider access, cache policy, directory/search logic, and user storage logic in focused modules; preserve `service.ts` as a stable facade when splitting code.
- Do not seed the full symbol directory in the live search path.
