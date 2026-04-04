import { beforeEach, describe, expect, it, vi } from "vitest"

const mockedDependencies = vi.hoisted(() => ({
  getAnalystSummary: vi.fn(),
  getCachedQuoteSnapshot: vi.fn(),
  getEarnings: vi.fn(),
  getEtfInfo: vi.fn(),
  getKeyMetricsTtm: vi.fn(),
  getStockCompanyProfile: vi.fn(),
  getStockDividendSnapshot: vi.fn(),
  getStockFinancialScores: vi.fn(),
  getStockShareFloat: vi.fn(),
  getStockTechnicals: vi.fn(),
  getStockValuationSnapshot: vi.fn(),
  getSymbolDirectoryEntry: vi.fn(),
}))

vi.mock("../cache", () => ({
  withMarketCache: vi.fn(
    ({ fetcher }: { fetcher: () => Promise<unknown> }) =>
      Promise.resolve(fetcher())
  ),
}))

vi.mock("../config", () => ({
  getMarketPlanSummary: vi.fn(),
  isCapabilityEnabled: vi.fn(() => true),
}))

vi.mock("../market-clock", () => ({
  createMarketDateClock: vi.fn(() => ({
    today: "2026-04-03",
  })),
}))

vi.mock("../service-support", () => ({
  ANALYST_TTL_SECONDS: 60,
  CALENDAR_TTL_SECONDS: 60,
  PROFILE_TTL_SECONDS: 60,
  QUOTE_FETCH_CONCURRENCY: 2,
  client: {
    analyst: {
      getSummary: mockedDependencies.getAnalystSummary,
    },
    calendar: {
      getEarnings: mockedDependencies.getEarnings,
    },
    etf: {
      getInfo: mockedDependencies.getEtfInfo,
    },
    fundamentals: {
      getKeyMetricsTtm: mockedDependencies.getKeyMetricsTtm,
    },
  },
  getCachedQuoteSnapshot: mockedDependencies.getCachedQuoteSnapshot,
  getMetricNumberByLabel: vi.fn(
    (metrics: { label: string; value: unknown }[], label: string) => {
      const metric = metrics.find((item) => item.label === label)
      return typeof metric?.value === "number" ? metric.value : null
    }
  ),
  mapWithConcurrency: vi.fn(
    async (
      items: unknown[],
      _concurrency: number,
      mapper: (item: unknown, index: number) => Promise<unknown>
    ) => Promise.all(items.map((item, index) => mapper(item, index)))
  ),
  normalizeSymbols: vi.fn((symbols: string[]) =>
    [...new Set(symbols.map((symbol) => symbol.trim().toUpperCase()))].filter(
      Boolean
    )
  ),
  rethrowMarketStoreUnavailable: vi.fn((error: unknown) => {
    throw error
  }),
}))

vi.mock("../service-dossier-fetchers", async () => {
  const actual = await vi.importActual("../service-dossier-fetchers")

  return {
    ...actual,
    getStockCompanyProfile: mockedDependencies.getStockCompanyProfile,
    getStockDividendSnapshot: mockedDependencies.getStockDividendSnapshot,
    getStockFinancialScores: mockedDependencies.getStockFinancialScores,
    getStockShareFloat: mockedDependencies.getStockShareFloat,
    getStockTechnicals: mockedDependencies.getStockTechnicals,
    getStockValuationSnapshot: mockedDependencies.getStockValuationSnapshot,
  }
})

vi.mock("../store", () => ({
  getSymbolDirectoryEntry: mockedDependencies.getSymbolDirectoryEntry,
  getWatchlistForUser: vi.fn(),
}))

import { buildResearchRows } from "../service-dossier-research"

describe("buildResearchRows", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockedDependencies.getSymbolDirectoryEntry.mockResolvedValue(null)
    mockedDependencies.getCachedQuoteSnapshot.mockResolvedValue({
      change: 0.2,
      changesPercentage: 0.72833,
      currency: "USD",
      marketCap: 29_568_235_712,
      name: "VICI Properties Inc.",
      price: 27.66,
    })
    mockedDependencies.getEtfInfo.mockResolvedValue(null)
    mockedDependencies.getStockCompanyProfile.mockResolvedValue({
      companyName: "VICI Properties Inc.",
      marketCap: 29_568_235_712,
      sector: "Real Estate",
    })
    mockedDependencies.getStockTechnicals.mockResolvedValue([])
    mockedDependencies.getEarnings.mockResolvedValue([])
    mockedDependencies.getAnalystSummary.mockResolvedValue(null)
    mockedDependencies.getStockFinancialScores.mockResolvedValue(null)
    mockedDependencies.getKeyMetricsTtm.mockResolvedValue([])
    mockedDependencies.getStockDividendSnapshot.mockResolvedValue({
      dividendPayoutRatioTtm: null,
      dividendPerShareTtm: null,
      dividendYieldTtm: null,
      frequency: "Quarterly",
      latestDeclarationDate: null,
      latestDividendDate: "2026-03-25",
      latestDividendPerShare: 0.2569,
      latestDividendYield: 3.456777996070727,
      latestPaymentDate: "2026-03-30",
      latestRecordDate: "2026-03-25",
    })
    mockedDependencies.getStockValuationSnapshot.mockResolvedValue(null)
    mockedDependencies.getStockShareFloat.mockResolvedValue(null)
  })

  it("falls back to cached company profiles and latest dividend events", async () => {
    const [row] = await buildResearchRows(["vici"])

    expect(row?.symbol).toBe("VICI")
    expect(row?.sector).toBe("Real Estate")
    expect(row?.dividendYieldTtm).toBeCloseTo(0.03456777996070727)
  })

  it("falls back to ETF info when the stock dividend snapshot is empty", async () => {
    mockedDependencies.getSymbolDirectoryEntry.mockResolvedValue({
      isEtf: true,
      sector: null,
    })
    mockedDependencies.getCachedQuoteSnapshot.mockResolvedValue({
      change: 0.15,
      changesPercentage: 0.41,
      currency: "USD",
      marketCap: null,
      name: "Schwab US Dividend Equity ETF",
      price: 80.12,
    })
    mockedDependencies.getStockCompanyProfile.mockResolvedValue(null)
    mockedDependencies.getStockDividendSnapshot.mockResolvedValue(null)
    mockedDependencies.getEtfInfo.mockResolvedValue({
      currency: "USD",
      dividendPerShare: 2.84,
      dividendYield: 0.0346,
      name: "Schwab US Dividend Equity ETF",
    })

    const [row] = await buildResearchRows(["schd"])

    expect(row).toEqual(
      expect.objectContaining({
        currency: "USD",
        dividendPerShareTtm: 2.84,
        dividendYieldTtm: 0.0346,
        instrumentKind: "etf",
        symbol: "SCHD",
      })
    )
  })
})
