import { beforeEach, describe, expect, it, vi } from "vitest"

const mockedDependencies = vi.hoisted(() => ({
  getCachedQuoteSnapshot: vi.fn(),
  getPortfolioForUser: vi.fn(),
  listPortfolioHoldingsForUser: vi.fn(),
}))

vi.mock("../service-support", () => ({
  getCachedQuoteSnapshot: mockedDependencies.getCachedQuoteSnapshot,
  mapWithConcurrency: vi.fn(
    async (
      items: unknown[],
      _concurrency: number,
      mapper: (item: unknown, index: number) => Promise<unknown>
    ) => Promise.all(items.map((item, index) => mapper(item, index)))
  ),
  QUOTE_FETCH_CONCURRENCY: 2,
}))

vi.mock("../store", async () => {
  const actual = await vi.importActual("../store")

  return {
    ...actual,
    getPortfolioForUser: mockedDependencies.getPortfolioForUser,
    listPortfolioHoldingsForUser:
      mockedDependencies.listPortfolioHoldingsForUser,
  }
})

import {
  formatAgentPortfolioPromptContext,
  getAgentPortfolioPromptContext,
} from "../service-portfolio-context"

describe("service-portfolio-context", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reads the latest saved portfolio snapshot on each call", async () => {
    mockedDependencies.getPortfolioForUser
      .mockResolvedValueOnce({
        baseCurrency: "USD",
        cashBalance: 500,
        createdAt: "2026-04-03T00:00:00.000Z",
        id: "default",
        name: "Portfolio",
        updatedAt: "2026-04-03T12:00:00.000Z",
      })
      .mockResolvedValueOnce({
        baseCurrency: "USD",
        cashBalance: 250,
        createdAt: "2026-04-03T00:00:00.000Z",
        id: "default",
        name: "Portfolio",
        updatedAt: "2026-04-03T12:05:00.000Z",
      })
    mockedDependencies.listPortfolioHoldingsForUser
      .mockResolvedValueOnce([
        {
          averageCost: 100,
          createdAt: "2026-04-03T00:00:00.000Z",
          id: "holding_aapl",
          notes: "Core compounding position",
          shares: 10,
          symbol: "AAPL",
          targetWeight: 0.2,
          updatedAt: "2026-04-03T12:00:00.000Z",
        },
        {
          averageCost: 200,
          createdAt: "2026-04-03T00:00:00.000Z",
          id: "holding_tsla",
          notes: null,
          shares: 3,
          symbol: "TSLA",
          targetWeight: null,
          updatedAt: "2026-04-03T12:00:00.000Z",
        },
      ])
      .mockResolvedValueOnce([
        {
          averageCost: 100,
          createdAt: "2026-04-03T00:00:00.000Z",
          id: "holding_aapl",
          notes: "Core compounding position",
          shares: 12,
          symbol: "AAPL",
          targetWeight: 0.25,
          updatedAt: "2026-04-03T12:05:00.000Z",
        },
        {
          averageCost: 80,
          createdAt: "2026-04-03T00:00:00.000Z",
          id: "holding_msft",
          notes: "New starter position",
          shares: 5,
          symbol: "MSFT",
          targetWeight: 0.1,
          updatedAt: "2026-04-03T12:05:00.000Z",
        },
      ])
    mockedDependencies.getCachedQuoteSnapshot
      .mockResolvedValueOnce({
        change: 1,
        changesPercentage: 0.84,
        currency: "USD",
        marketCap: 1,
        name: "Apple Inc.",
        price: 120,
      })
      .mockResolvedValueOnce({
        change: -2,
        changesPercentage: -0.79,
        currency: "USD",
        marketCap: 1,
        name: "Tesla Inc.",
        price: 250,
      })
      .mockResolvedValueOnce({
        change: 1,
        changesPercentage: 0.77,
        currency: "USD",
        marketCap: 1,
        name: "Apple Inc.",
        price: 130,
      })
      .mockResolvedValueOnce({
        change: 0.5,
        changesPercentage: 0.56,
        currency: "USD",
        marketCap: 1,
        name: "Microsoft Corp.",
        price: 90,
      })

    const first = await getAgentPortfolioPromptContext({
      now: new Date("2026-04-03T18:45:00.000Z"),
      userId: "user_123",
    })
    const second = await getAgentPortfolioPromptContext({
      now: new Date("2026-04-03T18:46:00.000Z"),
      userId: "user_123",
    })

    expect(first.status).toBe("ready")
    if (first.status !== "ready") {
      throw new Error("Expected a ready portfolio context.")
    }
    expect(first.holdings).toEqual([
      expect.objectContaining({
        costBasis: 1000,
        dayChangeValue: 10,
        latestPrice: 120,
        shares: 10,
        symbol: "AAPL",
        targetWeight: 0.2,
        unrealizedGainLoss: 200,
      }),
      expect.objectContaining({
        costBasis: 600,
        dayChangeValue: -6,
        latestPrice: 250,
        shares: 3,
        symbol: "TSLA",
        unrealizedGainLoss: 150,
      }),
    ])
    expect(first.summary).toEqual(
      expect.objectContaining({
        cashBalance: 500,
        dayChangeValue: 4,
        holdingCount: 2,
        totalCostBasis: 1600,
        totalValue: 2450,
        unrealizedGainLoss: 350,
      })
    )
    expect(second.status).toBe("ready")
    if (second.status !== "ready") {
      throw new Error("Expected a ready portfolio context.")
    }
    expect(second.holdings).toEqual([
      expect.objectContaining({
        costBasis: 1200,
        dayChangeValue: 12,
        latestPrice: 130,
        shares: 12,
        symbol: "AAPL",
        targetWeight: 0.25,
        unrealizedGainLoss: 360,
      }),
      expect.objectContaining({
        costBasis: 400,
        dayChangeValue: 2.5,
        latestPrice: 90,
        shares: 5,
        symbol: "MSFT",
        targetWeight: 0.1,
        unrealizedGainLoss: 50,
      }),
    ])
    expect(second.summary).toEqual(
      expect.objectContaining({
        cashBalance: 250,
        dayChangeValue: 14.5,
        holdingCount: 2,
        totalCostBasis: 1600,
        totalValue: 2260,
        unrealizedGainLoss: 410,
      })
    )
  })

  it("falls back to average cost when quote data is missing", async () => {
    mockedDependencies.getPortfolioForUser.mockResolvedValue({
      baseCurrency: "USD",
      cashBalance: 0,
      createdAt: "2026-04-03T00:00:00.000Z",
      id: "default",
      name: "Portfolio",
      updatedAt: "2026-04-03T12:00:00.000Z",
    })
    mockedDependencies.listPortfolioHoldingsForUser.mockResolvedValue([
      {
        averageCost: 150,
        createdAt: "2026-04-03T00:00:00.000Z",
        id: "holding_1",
        notes: null,
        shares: 4,
        symbol: "AAPL",
        targetWeight: null,
        updatedAt: "2026-04-03T12:00:00.000Z",
      },
    ])
    mockedDependencies.getCachedQuoteSnapshot.mockResolvedValue(null)

    const context = await getAgentPortfolioPromptContext({
      now: new Date("2026-04-03T18:45:00.000Z"),
      userId: "user_123",
    })

    expect(context).toMatchObject({
      holdings: [
        expect.objectContaining({
          costBasis: 600,
          dayChangeValue: null,
          latestPrice: 150,
          latestPriceSource: "average_cost",
          marketValue: 600,
          symbol: "AAPL",
          unrealizedGainLoss: 0,
        }),
      ],
      status: "ready",
    })
  })

  it("returns empty when no saved holdings or cash exist", async () => {
    mockedDependencies.getPortfolioForUser.mockResolvedValue(null)
    mockedDependencies.listPortfolioHoldingsForUser.mockResolvedValue([])

    await expect(
      getAgentPortfolioPromptContext({
        now: new Date("2026-04-03T18:45:00.000Z"),
        userId: "user_123",
      })
    ).resolves.toEqual({
      snapshotAt: "2026-04-03T18:45:00.000Z",
      status: "empty",
    })
  })

  it("returns unavailable when portfolio storage cannot be read", async () => {
    mockedDependencies.getPortfolioForUser.mockRejectedValue({
      code: "42P01",
    })

    await expect(
      getAgentPortfolioPromptContext({
        now: new Date("2026-04-03T18:45:00.000Z"),
        userId: "user_123",
      })
    ).resolves.toEqual({
      snapshotAt: "2026-04-03T18:45:00.000Z",
      status: "unavailable",
    })
  })

  it("formats truncation deterministically while preserving symbol coverage", () => {
    const context = {
      holdings: [
        {
          averageCost: 180,
          costBasis: 1800,
          dayChangePercent: 0.01,
          dayChangeValue: 19,
          latestPrice: 190,
          latestPriceSource: "quote" as const,
          marketValue: 1900,
          notes:
            "Primary thesis note that is intentionally long enough to trigger truncation when the prompt budget gets tight.",
          shares: 10,
          symbol: "AAPL",
          targetWeight: 0.25,
          unrealizedGainLoss: 100,
          unrealizedGainLossPercent: 100 / 1800,
          weight: 0.42,
        },
        {
          averageCost: 420,
          costBasis: 1260,
          dayChangePercent: -0.02,
          dayChangeValue: -8,
          latestPrice: 430,
          latestPriceSource: "quote" as const,
          marketValue: 1290,
          notes:
            "Second thesis note that should also be removed before symbol coverage is dropped from the formatted output.",
          shares: 3,
          symbol: "NVDA",
          targetWeight: 0.15,
          unrealizedGainLoss: 30,
          unrealizedGainLossPercent: 30 / 1260,
          weight: 0.28,
        },
      ],
      snapshotAt: "2026-04-03T18:45:00.000Z",
      status: "ready" as const,
      summary: {
        dayChangePercent: 0.002,
        dayChangeValue: 11,
        cashBalance: 700,
        holdingCount: 2,
        investedValue: 3190,
        topPositionConcentration: 0.42,
        totalCostBasis: 3060,
        totalValue: 3890,
        unrealizedGainLoss: 250,
        unrealizedGainLossPercent: 250 / 3060,
      },
    }

    const first = formatAgentPortfolioPromptContext(context, {
      maxCharacters: 520,
      noteMaxChars: 24,
    })
    const second = formatAgentPortfolioPromptContext(context, {
      maxCharacters: 520,
      noteMaxChars: 24,
    })

    expect(first).toBe(second)
    expect(first.length).toBeLessThanOrEqual(520)
    expect(first).toContain("AAPL")
    expect(first).toContain("NVDA")
    expect(first).toContain("day_pl")
    expect(first).toContain("total_pl")
    expect(first).not.toContain("Primary thesis note")
  })
})
