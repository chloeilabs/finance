# CLAUDE.md

## Project

Yurie Markets — a Next.js 16 (App Router) stock research terminal with two auth-gated surfaces:

- `/(home)`: market research workspace (watchlists, screeners, stock dossiers, calendars, breadth)
- `/copilot`: AI agent workspace (OpenRouter streaming with MCP tools)

## Tech Stack

- **Framework**: Next.js 16, React 19, TypeScript (strict)
- **Styling**: Tailwind CSS 4, shadcn/ui (radix-lyra), Lucide icons
- **Database**: PostgreSQL with Kysely
- **Auth**: Better Auth
- **AI**: Vercel AI SDK + OpenRouter + MCP (FMP, Tavily)
- **Package manager**: pnpm 10 (Node 20+)

## Common Commands

```bash
# Install
pnpm install

# Copy env template (required before running migrations)
cp .env.example .env.local

# Dev server (port 3000)
pnpm dev

# Verification matrix — run before closing substantial work
pnpm test              # Vitest unit tests
pnpm lint              # ESLint (--max-warnings=0)
pnpm typecheck         # next typegen && tsc --noEmit
pnpm build             # Production build

# Individual tools
pnpm lint:fix          # Auto-fix lint issues
pnpm format            # Prettier
pnpm format:check      # Check formatting
pnpm test:watch        # Vitest watch mode

# E2E (Playwright, requires chromium)
pnpm test:e2e:install  # Install browser
pnpm test:e2e          # Run smoke tests

# Database migrations (run in order on fresh setup)
pnpm auth:migrate
pnpm threads:migrate
pnpm markets:migrate

# Market capability checks (after FMP/market changes)
pnpm markets:capabilities
```

## Project Structure

```
src/
  app/              # App Router pages and route handlers
    (home)/         # Market workspace pages
    (auth)/         # Auth pages (sign-in, sign-up)
    copilot/        # Agent workspace
    api/            # Route handlers
  components/       # UI components by domain (markets, agent, auth, ui)
  lib/
    server/         # Server-only: auth, markets, threads, agent runtime
    shared/         # Shared types and pure helpers (narrow imports, no barrels)
    actions/        # Server actions
  hooks/            # React hooks
  types/            # Shared TypeScript types
docs/
  architecture/     # Detailed system notes (markets.md, copilot.md)
  agents/           # Agent-facing guidance (repo-map.md, verification.md)
e2e/                # Playwright tests
test/               # Shared test utilities and build-config tests (not domain tests)
```

## Architecture Rules

- **Server/client boundary**: Client components must not import `server-only` modules.
- **Route handlers**: Keep thin — push domain logic into `src/lib/server/*`.
- **Market dates**: Always use `createMarketDateClock()`, never raw Date math.
- **Market data**: `src/lib/server/markets` owns FMP access, cache, storage, and market-time rules.
- **Copilot streaming**: Lives under `src/app/api/agent` and `src/components/agent`.
- **Tests**: Prefer domain-local `__tests__` folders; use the top-level `test/` directory only for repo-level infrastructure tests and shared test utilities.
- **Imports**: Prefer narrow imports from `src/lib/shared/*` — avoid adding new catch-all barrels.
- **Route contracts**: Do not change route URLs or JSON response shapes unless explicitly required.

## Nested Guidance

Check the nearest `AGENTS.md` when working in specialized areas:

- `src/app/api/AGENTS.md` — route handler patterns
- `src/app/api/agent/AGENTS.md` — streaming and thread state
- `src/lib/server/markets/AGENTS.md` — markets module patterns
- `src/components/agent/AGENTS.md` — copilot component rules

Architecture docs: `docs/architecture/markets.md`, `docs/architecture/copilot.md`

## Environment

Required env vars (see `.env.example` for full list):

- `DATABASE_URL` — PostgreSQL connection string
- `BETTER_AUTH_SECRET` — auth secret
- `BETTER_AUTH_URL` — app origin (default `http://localhost:3000`)

Feature-gating env vars (optional):

- `FMP_API_KEY` — enables market data and FMP MCP tools
- `OPENROUTER_API_KEY` — enables `/copilot` agent workspace
- `TAVILY_API_KEY` — enables search tools in copilot

## Code Style

- Prettier: 80-char width, ES5 trailing commas, Tailwind plugin
- ESLint: zero warnings policy, simple-import-sort, jsx-a11y
- TypeScript: strict mode, no unchecked indexed access, `@/*` path alias to `src/`
- No unnecessary barrels, no speculative abstractions
