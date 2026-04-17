# Repo Map

## Product Areas

- `src/app/(home)`: market workspace pages, including overview, news, watchlists, and portfolio
- `src/app/copilot`: copilot entrypoint and layout
- `src/app/api`: route handlers for auth, markets, threads, and agent streaming

## UI

- `src/components/markets`: market layout, search, portfolio, watchlists, stocks, and primitives
- `src/components/agent`: copilot home, messages, markdown, and prompt form
- `src/components/auth`: auth screens and user menu
- `src/components/ui`: shared UI primitives

## Server Modules

- `src/lib/server/auth*`: Better Auth session helpers
- `src/lib/server/threads.ts`: thread storage and persistence
- `src/lib/server/markets`: market provider, caching, portfolio/watchlist storage, and page orchestration
- `src/lib/server/llm`: model adapters and tool wiring for `/copilot`

## Shared Modules

- `src/lib/shared/auth.ts`: viewer/session types
- `src/lib/shared/threads.ts`: thread and message types
- `src/lib/shared/llm/*`: model and system-instruction types
- `src/lib/shared/markets/*`: market-facing types and UI-safe payloads

## Agent Assets

- `AGENTS.md`: root repo contract
- `src/**/AGENTS.md`: local rules for specialized subtrees, with nearer files overriding broader ones
- `src/app/api/agent/AGENTS.md`: streaming-specific contract for the authenticated agent route
- `docs/references/*`: external reference docs vendored into the repo for offline/consistent agent access
- `.codex/config.toml`: Codex discovery tuning
