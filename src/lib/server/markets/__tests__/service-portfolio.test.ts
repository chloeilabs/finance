import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../service-dossier-research", () => ({
  buildResearchRows: vi.fn(),
}))

vi.mock("../store", async () => {
  const actual = await vi.importActual("../store")

  return {
    ...actual,
    ensureDefaultPortfolioForUser: vi.fn(),
    listPortfolioHoldingsForUser: vi.fn(),
  }
})

import { buildResearchRows } from "../service-dossier-research"
import {
  buildPortfolioAllocationBuckets,
  buildPortfolioHoldingViews,
  buildPortfolioSummary,
  getPortfolioPageData,
} from "../service-portfolio"
import * as store from "../store"

describe("portfolio service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("falls back to average cost when a live quote is missing", () => {
    const holdings = buildPortfolioHoldingViews({
      cashBalance: 0,
      holdings: [
        {
          averageCost: 150,
          createdAt: "2026-04-03T00:00:00.000Z",
          id: "holding_1",
          notes: null,
          shares: 10,
          symbol: "AAPL",
          targetWeight: null,
          updatedAt: "2026-04-03T00:00:00.000Z",
        },
      ],
      researchRows: [],
    })

    expect(holdings).toEqual([
      expect.objectContaining({
        marketValue: 1500,
        price: null,
        unrealizedGainLoss: 0,
      }),
    ])
  })

  it("derives summary totals and allocation weights", () => {
    const holdings = [
      {
        analystConsensus: "Buy",
        averageCost: 120,
        costBasis: 1200,
        createdAt: "2026-04-03T00:00:00.000Z",
        currency: "USD",
        dayChangePercent: 2,
        dayChangeValue: 30,
        dividendYieldTtm: 0.01,
        id: "holding_1",
        instrumentKind: "stock" as const,
        marketValue: 1500,
        name: "Apple Inc.",
        nextEarningsDate: "2026-05-01",
        notes: null,
        price: 150,
        sector: "Technology",
        shares: 10,
        symbol: "AAPL",
        targetWeight: null,
        unrealizedGainLoss: 300,
        unrealizedGainLossPercent: 0.25,
        updatedAt: "2026-04-03T00:00:00.000Z",
        weight: null,
      },
      {
        analystConsensus: "Hold",
        averageCost: 80,
        costBasis: 800,
        createdAt: "2026-04-03T00:00:00.000Z",
        currency: "USD",
        dayChangePercent: -1,
        dayChangeValue: -10,
        dividendYieldTtm: 0.02,
        id: "holding_2",
        instrumentKind: "etf" as const,
        marketValue: 1000,
        name: "Dividend ETF",
        nextEarningsDate: null,
        notes: null,
        price: 100,
        sector: "Income",
        shares: 10,
        symbol: "SCHD",
        targetWeight: null,
        unrealizedGainLoss: 200,
        unrealizedGainLossPercent: 0.25,
        updatedAt: "2026-04-03T00:00:00.000Z",
        weight: null,
      },
    ]

    const summary = buildPortfolioSummary({
      cashBalance: 500,
      holdings,
    })
    const allocations = buildPortfolioAllocationBuckets({
      cashBalance: 500,
      holdings,
      totalValue: summary.totalValue,
    })

    expect(summary).toEqual(
      expect.objectContaining({
        cashBalance: 500,
        dayChangeValue: 20,
        holdingCount: 2,
        investedValue: 2500,
        totalCostBasis: 2000,
        totalValue: 3000,
        unrealizedGainLoss: 500,
      })
    )
    expect(allocations.instrumentAllocations).toEqual([
      expect.objectContaining({
        label: "Stock",
        value: 1500,
        weight: 0.5,
      }),
      expect.objectContaining({
        label: "ETF",
        value: 1000,
        weight: 1 / 3,
      }),
      expect.objectContaining({
        label: "Cash",
        value: 500,
        weight: 1 / 6,
      }),
    ])
    expect(allocations.sectorAllocations).toEqual([
      expect.objectContaining({
        label: "Technology",
        value: 1500,
        weight: 0.6,
      }),
      expect.objectContaining({
        label: "Income",
        value: 1000,
        weight: 0.4,
      }),
    ])
  })

  it("ensures the default portfolio exists before building page data", async () => {
    vi.mocked(store.ensureDefaultPortfolioForUser).mockResolvedValue({
      baseCurrency: "USD",
      cashBalance: 250,
      createdAt: "2026-04-03T00:00:00.000Z",
      id: "default",
      name: "Portfolio",
      updatedAt: "2026-04-03T00:00:00.000Z",
    })
    vi.mocked(store.listPortfolioHoldingsForUser).mockResolvedValue([
      {
        averageCost: 100,
        createdAt: "2026-04-03T00:00:00.000Z",
        id: "holding_1",
        notes: null,
        shares: 5,
        symbol: "MSFT",
        targetWeight: null,
        updatedAt: "2026-04-03T00:00:00.000Z",
      },
    ])
    vi.mocked(buildResearchRows).mockResolvedValue([
      {
        altmanZScore: null,
        analystConsensus: "Buy",
        change: 2,
        changesPercentage: 1.9,
        currency: "USD",
        dcf: null,
        dividendPayoutRatioTtm: null,
        dividendPerShareTtm: null,
        dividendYieldTtm: 0.008,
        fcfYield: null,
        floatShares: null,
        freeFloatPercentage: null,
        instrumentKind: "stock",
        marketCap: 1000,
        name: "Microsoft Corp.",
        nextEarningsDate: "2026-04-28",
        piotroskiScore: null,
        price: 110,
        rsi14: null,
        roic: null,
        sector: "Technology",
        symbol: "MSFT",
      },
    ])

    const result = await getPortfolioPageData("user_123")

    expect(store.ensureDefaultPortfolioForUser).toHaveBeenCalledWith("user_123")
    expect(result.summary.totalValue).toBe(800)
    expect(result.holdings[0]).toEqual(
      expect.objectContaining({
        marketValue: 550,
        symbol: "MSFT",
      })
    )
  })

  it("surfaces storage initialization failures", async () => {
    vi.mocked(store.ensureDefaultPortfolioForUser).mockRejectedValue({
      code: "42P01",
    })

    await expect(getPortfolioPageData("user_123")).rejects.toMatchObject({
      code: "market_storage_unavailable",
    })
  })
})
