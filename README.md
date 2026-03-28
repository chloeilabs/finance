# Yurie Markets

Yurie Markets is a Next.js 16 stock research terminal for the Yurie family of apps. It is auth-gated, FMP-backed, and designed around US equities first, with watchlists, screeners, stock dossiers, calendars, market breadth, and a secondary `/copilot` workspace that preserves the original Yurie agent stack.

## Requirements

- Node.js 20+
- pnpm 9+
- PostgreSQL

## Getting started

```bash
pnpm install
cp .env.example .env.local
pnpm auth:migrate
pnpm threads:migrate
pnpm markets:migrate
pnpm dev
```

The app runs on [http://localhost:3000](http://localhost:3000).

## Required environment

- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`

## Optional environment

- `FMP_API_KEY`: enables Financial Modeling Prep market data
- `FMP_PLAN_TIER`: manual Financial Modeling Prep plan label used for server-side capability gating (`STARTER`, `PREMIUM`, or `ULTIMATE`)
- `OPENROUTER_API_KEY`: enables the `/copilot` agent workspace
- `TAVILY_API_KEY`: enables search tools inside `/copilot`

Without `FMP_API_KEY`, the market shell still renders but the data sections remain empty and show setup warnings.

## Scripts

- `pnpm dev`: start the Next.js dev server
- `pnpm build`: build the production app
- `pnpm start`: run the production app
- `pnpm auth:migrate`: apply Better Auth schema changes
- `pnpm threads:migrate`: apply thread storage schema changes
- `pnpm markets:migrate`: apply market storage schema changes
- `pnpm markets:capabilities`: probe representative FMP endpoints against the current key to audit tier access assumptions
- `pnpm lint`: run ESLint
- `pnpm lint:fix`: run ESLint autofixes
- `pnpm format`: run Prettier
- `pnpm format:check`: verify formatting
- `pnpm typecheck`: run TypeScript checks

## Product routes

- `/`: market overview workspace
- `/markets`: broad market context
- `/news`: market news feed
- `/calendar`: upcoming catalysts
- `/screeners`: submit-based company screener
- `/watchlists/[id]`: durable user watchlist
- `/stocks/[symbol]`: stock dossier page
- `/copilot`: Yurie agent workspace

## Storage

`pnpm markets:migrate` creates:

- `symbol_directory`
- `watchlist`
- `watchlist_items`
- `saved_screens`
- `market_cache_entries`
- `market_api_usage_daily`
- `market_api_usage_minute`

## Notes

- FMP access is server-only. The browser never sees the API key.
- The FMP integration uses `/stable/*` endpoints with plan-aware fallbacks for tiers that do not expose batch quotes, batch index quotes, ETF asset exposure, or DCF.
- Set `FMP_PLAN_TIER=STARTER` for Starter access. Starter is treated as US-only with 300 calls per minute and 20 GB over a trailing 30-day window.
- Thread metadata now supports a bound stock symbol so the copilot path can attach to a company later without creating a separate chat system.
