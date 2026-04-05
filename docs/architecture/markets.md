# Markets Architecture

## Responsibilities

- provider access: FMP REST request and mapping logic plus FMP MCP access for `/copilot`
- cache policy: TTLs, stale-on-error fallback, cache keys
- market time: `createMarketDateClock()` for all day-based queries
- storage: portfolios, watchlists, saved screeners, symbol directory, cache entries, usage tracking
- page orchestration: compose provider and storage data for routes/pages

## Working Rules

- keep live FMP request semantics centralized
- keep FMP MCP connection setup centralized and reuse the existing FMP env/config surface
- keep store and provider failures distinguishable
- split focused modules by concern, then preserve stable exports from the existing facade while consumers migrate
- search and directory hydration must stay non-blocking for user requests

## Current Focused Modules

- `cache.ts`: market cache orchestration and stale fallback
- `service.ts`: stable facade plus higher-level page orchestration
- `service-overview.ts`: home and news aggregation
- `service-dossier.ts`: stable dossier facade for stock and watchlist flows
- `service-portfolio.ts`: single-portfolio page assembly, holding enrichment, and derived allocation/summary math
- `service-portfolio-context.ts`: read-only saved portfolio snapshot formatting for `/copilot` request-time prompt context
- `service-dossier-overview.ts`: stock summary and locked-section resolution
- `service-dossier-sections.ts`: trading, financial, context, street-view, and business section builders
- `service-dossier-research.ts`: watchlist research assembly
- `service-dossier-fetchers.ts`: reusable cached stock fetch helpers
- `service-data.ts`: Starter dataset catalog, access-state resolution, and generic dataset fetch helpers
- `store.ts`: stable Postgres persistence facade
- `store-*.ts`: focused persistence modules for portfolios, watchlists, directory, cache/usage, and screeners
- `client.ts`: stable FMP client facade
- `client/*`: domain-specific FMP fetchers and response mappers
- `market-clock.ts`: market-day date helpers
- `starter-datasets.ts`: checked-in Starter dataset registry, query-field metadata, and capability derivation helpers
- `fmp-plan-validation*.ts`: validated Starter dataset access snapshot plus coarse capability compatibility layer
- `errors.ts` / `api-errors.ts`: domain error contracts
- `../llm/ai-sdk-fmp-mcp-tools.ts`: remote FMP MCP session bootstrap and usage-tracked tool wrapping for `/copilot`

## Copilot Portfolio Context

- `/copilot` reads saved portfolio state at request time and injects it into the prompt prelude instead of persisting hidden thread messages.
- the portfolio snapshot stays read-only in the agent path: no default portfolio creation and no route contract changes
- when saved portfolio context is unavailable, `/copilot` continues without it and tells the model not to assume holdings from stale conversation state
