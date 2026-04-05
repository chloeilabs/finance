---
name: markets-workflow
description: Use when working on the market workspace, FMP integration, cache/storage behavior, market routes, or stock/watchlist/screener flows in this repo. Do not use for `/copilot`-only UI or generic Next.js work that does not touch market data. Expected output: code changes plus the relevant market verification commands and any migration or capability checks that were required.
metadata:
  short-description: Repo workflow for market features
---

# Markets Workflow

Use this skill for changes under `src/lib/server/markets`, `src/components/markets`, `src/app/(home)`, or `src/app/api/market*`, `watchlists`, and `screeners`.

## Use When

- the task changes FMP request behavior, cache policy, or market-time logic
- the task changes watchlists, screeners, symbol search, or stock dossier behavior
- the task changes market route error contracts or degraded states

## Do Not Use When

- the task is only about `/copilot`, thread state, or model routing
- the task is generic repo maintenance with no market feature impact

## Workflow

1. Read `src/lib/server/markets/AGENTS.md` and [docs/architecture/markets.md](../../../docs/architecture/markets.md).
2. When the change touches market pages or market UI, also check the root `AGENTS.md` guidance for the relevant market route/component subtree.
3. Check whether the change touches provider access, cache semantics, storage initialization, or market-time logic.
4. Keep route handlers thin and push market logic into focused server modules.
5. When splitting code, preserve stable facades so page and route imports stay readable.
6. Verify with the full repo matrix and add `pnpm markets:capabilities` when FMP capability assumptions changed.

## Expected Output

- concise summary of the market-facing change
- note whether migrations or capability checks were required
- exact verification commands run
