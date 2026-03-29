import { describe, expect, it } from "vitest"

import {
  createPromptSteeringBlocks,
  inferPromptOverlays,
} from "../agent-prompt-steering"

describe("inferPromptOverlays", () => {
  it("returns no overlays for a general request", () => {
    expect(
      inferPromptOverlays([{ role: "user", content: "Summarize this note." }])
    ).toEqual([])
  })

  it("detects a format-sensitive request", () => {
    expect(
      inferPromptOverlays([
        {
          role: "user",
          content: "Return only valid JSON with keys foo and bar.",
        },
      ])
    ).toEqual(["format_sensitive"])
  })

  it("detects a code-centric request", () => {
    expect(
      inferPromptOverlays([
        {
          role: "user",
          content: "Write Python code to parse this text input.",
        },
      ])
    ).toEqual(["coding"])
  })

  it("detects a research request", () => {
    expect(
      inferPromptOverlays([
        {
          role: "user",
          content: "Check the latest earnings date and cite sources.",
        },
      ])
    ).toEqual(["research"])
  })

  it("detects a high-stakes request", () => {
    expect(
      inferPromptOverlays([
        {
          role: "user",
          content: "My password may have been stolen in a phishing attack.",
        },
      ])
    ).toEqual(["high_stakes"])
  })

  it("detects a closed-answer request", () => {
    expect(
      inferPromptOverlays([
        { role: "user", content: "Choose one option and end with Answer: B." },
      ])
    ).toEqual(["closed_answer"])
  })

  it("combines overlays for mixed research, coding, high-stakes, and strict-output prompts", () => {
    expect(
      inferPromptOverlays([
        {
          role: "user",
          content:
            "This is a security incident. Verify the latest phishing indicators, write Python to normalize them, and return only valid JSON.",
        },
      ])
    ).toEqual(["high_stakes", "research", "coding", "format_sensitive"])
  })

  it("preserves format-sensitive context from earlier user turns", () => {
    expect(
      inferPromptOverlays([
        { role: "user", content: "Return only valid JSON." },
        { role: "assistant", content: "Understood." },
        { role: "user", content: "Now check the latest filings for AAPL." },
      ])
    ).toEqual(["research", "format_sensitive"])
  })
})

describe("createPromptSteeringBlocks", () => {
  it("emits provider and overlay blocks in deterministic order", () => {
    const blocks = createPromptSteeringBlocks({
      provider: "openrouter",
      overlays: ["format_sensitive", "research", "coding", "high_stakes"],
    })

    expect(blocks.map((block) => block.label)).toEqual([
      "PROVIDER OVERLAY: OPENROUTER",
      "REQUEST OVERLAY: HIGH_STAKES",
      "REQUEST OVERLAY: RESEARCH",
      "REQUEST OVERLAY: CODING",
      "REQUEST OVERLAY: FORMAT_SENSITIVE",
    ])
  })
})
