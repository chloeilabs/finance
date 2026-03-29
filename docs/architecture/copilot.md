# Copilot Architecture

## Surface Area

- `src/app/copilot`: route entry and layout
- `src/app/api/agent/route.ts`: authenticated streaming API
- `src/components/agent/home`: thread list, stream accumulator, session state
- `src/lib/server/llm/*`: model/provider and tool integration

## Working Rules

- separate pure stream and sorting helpers from React components/hooks
- keep thread persistence independent from transient stream state
- preserve authenticated, no-store request handling for agent routes
- prefer narrow shared imports for models, messages, and threads

## Current Focused Modules

- `use-agent-session.ts`: stable session hook facade
- `agent-session-request.ts`: `/api/agent` streaming request loop
- `agent-session-helpers.ts`: pure session state helpers and message assembly
- `threads-context.tsx`: provider shell and public context surface
- `threads-persistence.ts`: queued thread sync, delete, rename, and migration orchestration
- `threads-api.ts`: thread route request helpers
- `threads-storage.ts`: local-storage migration and merge helpers

## Verification Priorities

- no regression in request-id and rate-limit handling
- no loss of thread switching or rename/pin/delete behavior
- streaming timeline remains stable for text, reasoning, tools, and sources
