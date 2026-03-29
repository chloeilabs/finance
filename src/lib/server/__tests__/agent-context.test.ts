import { describe, expect, it } from "vitest"

import {
  DEFAULT_OPERATING_INSTRUCTION,
  DEFAULT_SOUL_FALLBACK_INSTRUCTION,
} from "../../shared/llm/system-instructions"
import { buildAgentPromptContract } from "../agent-context"
import {
  createPromptSteeringBlocks,
  PROMPT_OVERLAY_ORDER,
} from "../agent-prompt-steering"

const viewer = {
  id: "user-123",
  name: "Yurie User",
  email: "yurie@example.com",
}

describe("buildAgentPromptContract", () => {
  it("keeps runtime context in prelude messages instead of the stable system instruction", () => {
    const contract = buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:45:00.000Z"),
      userTimeZone: "America/Chicago",
      provider: "openrouter",
      overlays: ["research", "format_sensitive"],
    })

    expect(contract.systemInstruction).toContain("OPERATING INSTRUCTIONS")
    expect(contract.systemInstruction).toContain("PROVIDER OVERLAY: OPENROUTER")
    expect(contract.systemInstruction).toContain("REQUEST OVERLAY: RESEARCH")
    expect(contract.systemInstruction).toContain(
      "REQUEST OVERLAY: FORMAT_SENSITIVE"
    )
    expect(contract.systemInstruction).toContain("SHARED CONTEXT FILE: SOUL.md")
    expect(contract.systemInstruction).not.toContain("RUNTIME DATE CONTEXT")
    expect(contract.systemInstruction).not.toContain("AUTH USER CONTEXT")

    expect(contract.preludeMessages).toHaveLength(2)
    expect(contract.preludeMessages.map((message) => message.role)).toEqual([
      "system",
      "system",
    ])
    expect(contract.preludeMessages[0]?.content).toContain(
      "Current UTC timestamp: 2026-03-29T18:45:00.000Z"
    )
    expect(contract.preludeMessages[1]?.content).toContain(
      "Authenticated user display name: Yurie User"
    )
  })

  it("omits auth id and email from the prompt contract", () => {
    const contract = buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:45:00.000Z"),
    })
    const allPromptContent = [
      contract.systemInstruction,
      ...contract.preludeMessages.map((message) => message.content),
    ].join("\n\n")

    expect(allPromptContent).not.toContain(viewer.id)
    expect(allPromptContent).not.toContain(viewer.email)
  })

  it("keeps the stable system instruction unchanged across timestamps", () => {
    const firstContract = buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:45:00.000Z"),
      userTimeZone: "America/Chicago",
      provider: "openrouter",
      overlays: ["research"],
    })
    const secondContract = buildAgentPromptContract(viewer, {
      now: new Date("2026-03-30T02:15:00.000Z"),
      userTimeZone: "America/Chicago",
      provider: "openrouter",
      overlays: ["research"],
    })

    expect(firstContract.systemInstruction).toBe(
      secondContract.systemInstruction
    )
    expect(firstContract.preludeMessages).not.toEqual(
      secondContract.preludeMessages
    )
  })

  it("preserves the SOUL identity block in the stable system instruction", () => {
    const contract = buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:45:00.000Z"),
    })

    expect(contract.systemInstruction).toContain(
      DEFAULT_SOUL_FALLBACK_INSTRUCTION
    )
  })

  it("keeps the stable prompt and overlays within the expected budget", () => {
    expect(DEFAULT_OPERATING_INSTRUCTION.length).toBeLessThanOrEqual(4000)

    const blocks = createPromptSteeringBlocks({
      provider: "openrouter",
      overlays: PROMPT_OVERLAY_ORDER,
    })

    for (const block of blocks) {
      expect(block.body.length).toBeLessThanOrEqual(600)
    }
  })

  it("orders the stable instruction as base contract, overlays, then SOUL", () => {
    const contract = buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:45:00.000Z"),
      provider: "openrouter",
      overlays: ["research", "coding", "format_sensitive"],
    })

    const operatingIndex = contract.systemInstruction.indexOf(
      "OPERATING INSTRUCTIONS"
    )
    const providerIndex = contract.systemInstruction.indexOf(
      "PROVIDER OVERLAY: OPENROUTER"
    )
    const researchIndex = contract.systemInstruction.indexOf(
      "REQUEST OVERLAY: RESEARCH"
    )
    const codingIndex = contract.systemInstruction.indexOf(
      "REQUEST OVERLAY: CODING"
    )
    const formatIndex = contract.systemInstruction.indexOf(
      "REQUEST OVERLAY: FORMAT_SENSITIVE"
    )
    const soulIndex = contract.systemInstruction.indexOf(
      "SHARED CONTEXT FILE: SOUL.md"
    )

    expect(operatingIndex).toBeGreaterThanOrEqual(0)
    expect(providerIndex).toBeGreaterThan(operatingIndex)
    expect(researchIndex).toBeGreaterThan(providerIndex)
    expect(codingIndex).toBeGreaterThan(researchIndex)
    expect(formatIndex).toBeGreaterThan(codingIndex)
    expect(soulIndex).toBeGreaterThan(formatIndex)
  })
})
