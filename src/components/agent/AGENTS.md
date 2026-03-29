# Copilot Rules

- Keep `/copilot` route behavior stable while refactoring.
- Separate pure stream-state helpers from React hooks/components when files grow large.
- Preserve client/server boundaries: UI state stays in client modules, prompt/model/tool orchestration stays server-side.
- Streaming code should tolerate partial events, retries, and empty states without losing thread history.
- Reuse shared thread/model types from narrow imports instead of broad repo barrels.
