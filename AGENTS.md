# Repo Contract

## Purpose

Yurie Markets is a Next.js App Router app with two product surfaces:

- `/(home)`: authenticated market research workspace
- `/copilot`: authenticated agent workspace

Keep behavior stable. This repo prefers incremental refactors over architecture rewrites.

## Repo Map

- `src/app`: App Router pages and route handlers
- `src/components`: UI and client-side state
- `src/lib/server`: server-only auth, storage, markets, and agent runtime code
- `src/lib/shared`: shared types and pure helpers; prefer narrow imports over broad barrels
- `docs/agents`: durable repo instructions for agents
- `docs/architecture`: system-specific architecture notes
- `.agents/skills`: repo-scoped repeatable workflows

Read [docs/agents/repo-map.md](docs/agents/repo-map.md) for the expanded layout.

## Setup And Verification

Run from the repo root:

```bash
pnpm install
cp .env.example .env.local
pnpm auth:migrate
pnpm threads:migrate
pnpm markets:migrate
pnpm dev
```

Required verification before closing work:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

See [docs/agents/verification.md](docs/agents/verification.md) for scoped checks and market-specific follow-ups.

## Do Not

- Do not change route URLs or JSON response shapes unless the task explicitly requires it.
- Do not bypass `createMarketDateClock` for daily market dates.
- Do not add or reintroduce catch-all barrels under `src/lib/shared`.
- Do not mix new tests back into feature roots; keep them under domain-local `__tests__` folders.
- Do not duplicate durable instructions in prompts when they belong in AGENTS or a repo skill.

## Boundaries

- Route handlers should stay thin and use shared auth/error helpers.
- `src/lib/server/markets` owns FMP access, cache policy, storage invariants, and market-time rules.
- `/copilot` streaming and thread state live under `src/components/agent` plus `src/app/api/agent`.
- Client components should not import server-only modules.

## Definition Of Done

- The change is scoped to one task/thread.
- Instructions and docs stay aligned with code.
- Tests are added or updated when behavior changes.
- The required verification matrix passes, or failures are documented with a concrete reason.

## Local Rules

- `src/app/api/AGENTS.md`
- `src/lib/server/markets/AGENTS.md`
- `src/components/agent/AGENTS.md`

## Cursor Cloud specific instructions

### PostgreSQL

The cloud VM does not ship with PostgreSQL. Start the cluster before running migrations or the dev server:

```bash
sudo pg_ctlcluster 16 main start
```

A local database is pre-configured (user `yurie`, password `yurie`, database `yurie` on `localhost:5432`). The environment may have a shell-level `DATABASE_URL` that shadows `.env.local`. Override it explicitly when running migration scripts by exporting `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` to match the values in `.env.local`.

### Running migrations

After `pnpm install` and before `pnpm dev`, run all three migrations:

```bash
pnpm auth:migrate
pnpm threads:migrate
pnpm markets:migrate
```

`threads:migrate` and `markets:migrate` read `.env.local` via `--env-file-if-exists`, but `auth:migrate` (better-auth CLI) reads `process.env` directly, so the shell-level `DATABASE_URL` export above is required.

### Verification commands

See the repo README "Scripts" section. The four required verification commands are: `pnpm test`, `pnpm lint`, `pnpm typecheck`, `pnpm build`.

### Dev server

`pnpm dev` starts on port 3000. All routes are auth-gated; unauthenticated requests redirect to `/sign-in`. Without `FMP_API_KEY`, the market workspace renders its shell but data sections show setup warnings. Without `OPENROUTER_API_KEY`, the copilot workspace loads but cannot send messages.
