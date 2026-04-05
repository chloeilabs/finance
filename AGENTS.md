# Repo Contract

## Scope

This file applies repo-wide. Prefer the nearest nested `AGENTS.md` for subtree-specific rules, and keep long playbooks in `docs/agents/*`, `docs/architecture/*`, or `.agents/skills/*`.

If an agent keeps making the same mistake, update the closest relevant `AGENTS.md` or skill instead of repeating the instruction in prompts.

## Product Surfaces

Yurie Markets is a Next.js App Router app with two authenticated surfaces:

- `/(home)`: market research workspace
- `/copilot`: agent workspace

Keep behavior stable. Prefer incremental refactors over architecture rewrites.

## Repo Map

- `src/app`: App Router pages and route handlers
- `src/components`: UI and client state
- `src/lib/server`: auth, storage, markets, and agent runtime code
- `src/lib/shared`: shared types and pure helpers; prefer narrow imports over broad barrels
- `docs/agents`: durable agent-facing guidance
- `docs/architecture`: system notes that are too detailed for AGENTS files
- `.agents/skills`: repeatable repo workflows

Read [docs/agents/repo-map.md](docs/agents/repo-map.md) for the expanded layout and [docs/agents/verification.md](docs/agents/verification.md) for scoped verification follow-ups.

## Core Workflow

From the repo root:

```bash
pnpm install
cp .env.example .env.local
pnpm auth:migrate
pnpm threads:migrate
pnpm markets:migrate
pnpm dev
```

Before closing substantial work, run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

## Hard Constraints

- Do not change route URLs or JSON response shapes unless the task explicitly requires it.
- Do not bypass `createMarketDateClock()` for daily market dates.
- Keep route handlers thin and push domain logic into shared server modules.
- `src/lib/server/markets` owns FMP access, cache policy, storage invariants, and market-time rules.
- `/copilot` streaming and thread state live under `src/components/agent` and `src/app/api/agent`.
- Client components must not import server-only modules.
- Keep tests in domain-local `__tests__` folders.
- Do not add or reintroduce catch-all barrels under `src/lib/shared`.
- Do not duplicate durable instructions in ad hoc prompts when they belong in AGENTS or a skill.

## Done Checklist

- Keep the change scoped to the requested task.
- Update docs or tests when behavior changes.
- Run the required verification matrix, or document a concrete blocker.

## Nested Instructions

Check the nearest nested `AGENTS.md` when working in specialized areas:

- `src/app/api/AGENTS.md`
- `src/app/api/agent/AGENTS.md`
- `src/lib/server/markets/AGENTS.md`
- `src/components/agent/AGENTS.md`

For longer workflows, use the matching skills:

- `.agents/skills/markets-workflow/SKILL.md`
- `.agents/skills/copilot-workflow/SKILL.md`
- `.agents/skills/repo-review/SKILL.md`

Only add another nested `AGENTS.md` when a subtree has durable rules that differ from its parent.

## Cursor Cloud Notes

### PostgreSQL

The cloud VM does not ship with PostgreSQL. Start the cluster before running migrations or the dev server:

```bash
sudo pg_ctlcluster 16 main start
```

A local database is pre-configured (user `yurie`, password `yurie`, database `yurie` on `localhost:5432`). The environment may expose a shell-level `DATABASE_URL` that shadows `.env.local`; override `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL` from `.env.local` before running `pnpm auth:migrate`.

### Migrations And Dev Server

`threads:migrate` and `markets:migrate` read `.env.local` via `--env-file-if-exists`, but `auth:migrate` reads `process.env` directly, so the explicit env override above is required.

`pnpm dev` starts on port 3000. All routes are auth-gated; unauthenticated requests redirect to `/sign-in`. Without `FMP_API_KEY`, market pages render their shell but show setup warnings. Without `OPENROUTER_API_KEY`, `/copilot` loads but cannot send messages.
