# References

This directory stores third-party reference documents that we intentionally vendor into the repository so Codex/Cursor workflows can read them without depending on live network fetches.

## OpenRouter Skills

- `openrouter-create-agent-SKILL.md`
  - Source: <https://openrouter.ai/skills/create-agent/SKILL.md>
  - Purpose: Reference copy of OpenRouter's `create-agent` skill guidance.

## Refresh Process

To refresh a vendored reference from its upstream source:

```bash
curl -fsSL https://openrouter.ai/skills/create-agent/SKILL.md \
  -o docs/references/openrouter-create-agent-SKILL.md
```
