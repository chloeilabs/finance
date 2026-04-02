import { beforeEach, describe, expect, it, vi } from "vitest"

const mockedFetchers = vi.hoisted(() => ({
  getStockDividendSnapshot: vi.fn(),
  screenCompanies: vi.fn(),
}))

vi.mock("../cache", () => ({
  mayUseLiveFmp: vi.fn(() => Promise.resolve(true)),
  withMarketCache: vi.fn(
    ({ fetcher }: { fetcher: () => Promise<unknown> }) =>
      Promise.resolve(fetcher())
  ),
}))

vi.mock("../client", () => ({
  FmpRequestError: class FmpRequestError extends Error {},
  createFmpClient: vi.fn(() => ({
    directory: {
      screenCompanies: mockedFetchers.screenCompanies,
      searchSymbols: vi.fn(),
      listExchanges: vi.fn(),
      listIndustries: vi.fn(),
      listSectors: vi.fn(),
    },
  })),
}))

vi.mock("../config", () => ({
  getFmpPlanValidationSummary: vi.fn(() => null),
  getMarketPlanSummary: vi.fn(() => ({
    bandwidthLimitLabel: "test",
    capabilities: {},
    historicalRangeLabel: "test",
    label: "Starter",
    quoteFreshnessLabel: "test",
    requestBudgetLabel: "test",
    tier: "STARTER",
    watchlistLimit: 75,
  })),
  isFmpConfigured: vi.fn(() => true),
}))

vi.mock("../service-dossier-fetchers", () => ({
  getStockDividendSnapshot: mockedFetchers.getStockDividendSnapshot,
  getStockFinancialScores: vi.fn(),
  getStockShareFloat: vi.fn(),
  getStockValuationSnapshot: vi.fn(),
}))

vi.mock("../service-support", () => ({
  CORE_WATCHLIST_SYMBOLS: ["AAPL", "MSFT"],
  PROFILE_TTL_SECONDS: 60,
  QUOTE_FETCH_CONCURRENCY: 2,
  getMetricNumberByLabel: vi.fn(() => null),
  mapWithConcurrency: vi.fn(async (
    items: unknown[],
    _concurrency: number,
    mapper: (item: unknown, index: number) => Promise<unknown>
  ) =>
    Promise.all(items.map((item, index) => mapper(item, index)))
  ),
}))

vi.mock("../store", () => ({
  createWatchlistForUser: vi.fn(),
  deleteSavedScreenerForUser: vi.fn(),
  ensureDefaultWatchlistForUser: vi.fn(),
  listSavedScreenersForUser: vi.fn(),
  listWatchlistsForUser: vi.fn(),
  replaceWatchlistSymbols: vi.fn(),
  searchSymbolDirectory: vi.fn(),
  upsertSavedScreenerForUser: vi.fn(),
  upsertSymbolDirectoryEntries: vi.fn(),
}))

import { runMarketScreener } from "../workspace"

describe("runMarketScreener dividend yield flow", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockedFetchers.screenCompanies.mockResolvedValue([
      {
        dividend: 1.04,
        marketCap: 10,
        name: "Alpha",
        symbol: "AAA",
      },
      {
        dividend: 2.2,
        marketCap: 20,
        name: "Bravo",
        symbol: "BBB",
      },
      {
        dividend: 0.5,
        marketCap: 15,
        name: "Charlie",
        symbol: "CCC",
      },
    ])

    mockedFetchers.getStockDividendSnapshot.mockImplementation(
      (symbol: string) => {
      switch (symbol) {
        case "AAA":
          return {
            dividendPerShareTtm: 1.04,
            dividendPayoutRatioTtm: 0.2,
            dividendYieldTtm: 0.01,
            frequency: "quarterly",
            latestDeclarationDate: null,
            latestDividendDate: null,
            latestDividendPerShare: null,
            latestDividendYield: null,
            latestPaymentDate: null,
            latestRecordDate: null,
          }
        case "BBB":
          return {
            dividendPerShareTtm: 2.2,
            dividendPayoutRatioTtm: 0.4,
            dividendYieldTtm: 0.03,
            frequency: "quarterly",
            latestDeclarationDate: null,
            latestDividendDate: null,
            latestDividendPerShare: null,
            latestDividendYield: null,
            latestPaymentDate: null,
            latestRecordDate: null,
          }
        case "CCC":
          return {
            dividendPerShareTtm: 0.5,
            dividendPayoutRatioTtm: 0.15,
            dividendYieldTtm: 0.02,
            frequency: "annual",
            latestDeclarationDate: null,
            latestDividendDate: null,
            latestDividendPerShare: null,
            latestDividendYield: null,
            latestPaymentDate: null,
            latestRecordDate: null,
          }
        default:
          return null
      }
      }
    )
  })

  it("applies dividend-yield filters and sorting locally after the native screen", async () => {
    const results = await runMarketScreener({
      dividendYieldMin: 2,
      sortBy: "dividendYield",
      sortDirection: "desc",
    })

    expect(mockedFetchers.screenCompanies).toHaveBeenCalledWith(
      expect.objectContaining({
        limit: 100,
      })
    )
    expect(results.map((result) => result.symbol)).toEqual(["BBB", "CCC"])
    expect(results[0]?.dividendYieldTtm).toBe(0.03)
  })

  it("keeps the legacy annual dividend filter on the native screener params", async () => {
    await runMarketScreener({
      dividendMin: 1.5,
      sortBy: "dividend",
      sortDirection: "desc",
    })

    expect(mockedFetchers.screenCompanies).toHaveBeenCalledWith(
      expect.objectContaining({
        dividendMoreThan: 1.5,
        limit: 25,
      })
    )
  })
})
