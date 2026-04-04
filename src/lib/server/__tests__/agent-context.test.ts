import { beforeEach, describe, expect, it, vi } from "vitest"

const mockedPortfolioContext = vi.hoisted(() => ({
  formatAgentPortfolioPromptContext: vi.fn(),
  getAgentPortfolioPromptContext: vi.fn(),
}))

vi.mock("../markets/service-portfolio-context", () => ({
  formatAgentPortfolioPromptContext:
    mockedPortfolioContext.formatAgentPortfolioPromptContext,
  getAgentPortfolioPromptContext:
    mockedPortfolioContext.getAgentPortfolioPromptContext,
}))

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
  beforeEach(() => {
    vi.clearAllMocks()
    mockedPortfolioContext.getAgentPortfolioPromptContext.mockResolvedValue({
      snapshotAt: "2026-03-29T18:45:00.000Z",
      status: "ready",
      summary: {
        dayChangePercent: 0.01,
        dayChangeValue: 20,
        cashBalance: 500,
        holdingCount: 1,
        investedValue: 1500,
        topPositionConcentration: 0.75,
        totalCostBasis: 1250,
        totalValue: 2000,
        unrealizedGainLoss: 250,
        unrealizedGainLossPercent: 0.2,
      },
      holdings: [
        {
          averageCost: 150,
          costBasis: 1500,
          dayChangePercent: 0.01,
          dayChangeValue: 15,
          latestPrice: 170,
          latestPriceSource: "quote",
          marketValue: 1500,
          notes: "Core thesis",
          shares: 10,
          symbol: "AAPL",
          targetWeight: 0.2,
          unrealizedGainLoss: 200,
          unrealizedGainLossPercent: 200 / 1500,
          weight: 0.75,
        },
      ],
    })
    mockedPortfolioContext.formatAgentPortfolioPromptContext.mockImplementation(
      (context: { status: string }) =>
        context.status === "ready"
          ? "# Runtime Portfolio Context\n\n- Summary: ready"
          : `# Runtime Portfolio Context\n\n- Summary: ${context.status}`
    )
  })

  it("keeps runtime context in prelude messages instead of the stable system instruction", async () => {
    const contract = await buildAgentPromptContract(viewer, {
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
    expect(contract.systemInstruction).not.toContain("PORTFOLIO CONTEXT")

    expect(contract.portfolioContextStatus).toBe("ready")
    expect(contract.preludeMessages).toHaveLength(3)
    expect(contract.preludeMessages.map((message) => message.role)).toEqual([
      "system",
      "system",
      "system",
    ])
    expect(contract.preludeMessages[0]?.content).toContain(
      "Current UTC timestamp: 2026-03-29T18:45:00.000Z"
    )
    expect(contract.preludeMessages[1]?.content).toContain(
      "Authenticated user display name: Yurie User"
    )
    expect(contract.preludeMessages[2]?.content).toContain("PORTFOLIO CONTEXT")
    expect(contract.preludeMessages[2]?.content).toContain("Summary: ready")
  })

  it("omits auth id and email from the prompt contract", async () => {
    const contract = await buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:45:00.000Z"),
    })
    const allPromptContent = [
      contract.systemInstruction,
      ...contract.preludeMessages.map((message) => message.content),
    ].join("\n\n")

    expect(allPromptContent).not.toContain(viewer.id)
    expect(allPromptContent).not.toContain(viewer.email)
  })

  it("keeps the stable system instruction unchanged across timestamps", async () => {
    const firstContract = await buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:45:00.000Z"),
      userTimeZone: "America/Chicago",
      provider: "openrouter",
      overlays: ["research"],
    })
    const secondContract = await buildAgentPromptContract(viewer, {
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

  it("preserves the SOUL identity block in the stable system instruction", async () => {
    const contract = await buildAgentPromptContract(viewer, {
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

  it("orders the stable instruction as base contract, overlays, then SOUL", async () => {
    const contract = await buildAgentPromptContract(viewer, {
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

  it("updates the portfolio prelude while keeping the stable system instruction unchanged", async () => {
    mockedPortfolioContext.getAgentPortfolioPromptContext
      .mockResolvedValueOnce({
        snapshotAt: "2026-03-29T18:45:00.000Z",
        status: "ready",
        summary: {
          dayChangePercent: 0.01,
          dayChangeValue: 20,
          cashBalance: 500,
          holdingCount: 1,
          investedValue: 1500,
          topPositionConcentration: 0.75,
          totalCostBasis: 1250,
          totalValue: 2000,
          unrealizedGainLoss: 250,
          unrealizedGainLossPercent: 0.2,
        },
        holdings: [],
      })
      .mockResolvedValueOnce({
        snapshotAt: "2026-03-29T18:46:00.000Z",
        status: "ready",
        summary: {
          dayChangePercent: 0.005,
          dayChangeValue: 10,
          cashBalance: 250,
          holdingCount: 2,
          investedValue: 1800,
          topPositionConcentration: 0.6,
          totalCostBasis: 1700,
          totalValue: 2050,
          unrealizedGainLoss: 100,
          unrealizedGainLossPercent: 100 / 1700,
        },
        holdings: [],
      })
    mockedPortfolioContext.formatAgentPortfolioPromptContext
      .mockReturnValueOnce("# Runtime Portfolio Context\n\n- Summary: first")
      .mockReturnValueOnce("# Runtime Portfolio Context\n\n- Summary: second")

    const firstContract = await buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:45:00.000Z"),
      provider: "openrouter",
    })
    const secondContract = await buildAgentPromptContract(viewer, {
      now: new Date("2026-03-29T18:46:00.000Z"),
      provider: "openrouter",
    })

    expect(firstContract.systemInstruction).toBe(
      secondContract.systemInstruction
    )
    expect(firstContract.preludeMessages[2]?.content).toContain(
      "Summary: first"
    )
    expect(secondContract.preludeMessages[2]?.content).toContain(
      "Summary: second"
    )
  })
})
