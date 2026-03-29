# Code Review

Review for reliability first:

- route contract drift
- server/client boundary violations
- stale cache or timezone regressions
- auth or storage failure handling
- missing tests around changed behavior

For large refactors, confirm:

- imports became narrower, not broader
- new modules have one clear responsibility
- old facade files still preserve stable entrypoints when needed
- instructions in AGENTS/docs still match the code
