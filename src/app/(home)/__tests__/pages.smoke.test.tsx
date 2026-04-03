import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentViewer: vi.fn(),
}))

vi.mock("@/lib/server/markets/service", () => ({
  getEtfDossier: vi.fn(),
  getLatestGeneralMarketNews: vi.fn(),
  getLatestInsiderFeed: vi.fn(),
  getLatestMarketNews: vi.fn(),
  getLatestSecActivity: vi.fn(),
  getMarketOverviewData: vi.fn(),
  getMultiAssetSnapshot: vi.fn(),
  resolveTickerInstrumentKind: vi.fn(),
  getStockDossier: vi.fn(),
  getStockDossierOverview: vi.fn(),
  getStockPriceHistoryIntradayChart: vi.fn(),
  getWatchlistPageData: vi.fn(),
}))

vi.mock("@/components/markets/stocks/stock-detail-sections", () => ({
  SectionLoadingState: ({ title }: { title: string }) => <div>{title}</div>,
  StockBusinessMixSection: () => <div>Business mix</div>,
  StockCatalystsSection: () => <div>Catalysts</div>,
  StockFinancialSection: () => <div>Financials</div>,
  StockPeersSection: () => <div>Peers</div>,
  StockPlanLimitsSection: () => <div>Plan limits</div>,
  StockQualitySection: () => <div>Quality</div>,
  StockSectionNav: () => <nav>Stock nav</nav>,
  StockStreetViewSection: () => <div>Street view</div>,
  StockTradingSection: () => <div>Trading</div>,
}))

vi.mock("@/components/markets/watchlists/watchlist-editor", () => ({
  WatchlistEditor: () => <div>Watchlist editor</div>,
}))

vi.mock("@/components/markets/watchlists/watchlist-research-table", () => ({
  WatchlistResearchTable: () => <div>Watchlist research table</div>,
}))

import { getCurrentViewer } from "@/lib/server/auth-session"
import {
  getEtfDossier,
  getLatestGeneralMarketNews,
  getLatestInsiderFeed,
  getLatestMarketNews,
  getLatestSecActivity,
  getMarketOverviewData,
  getMultiAssetSnapshot,
  getStockDossier,
  getStockDossierOverview,
  getStockPriceHistoryIntradayChart,
  getWatchlistPageData,
  resolveTickerInstrumentKind,
} from "@/lib/server/markets/service"

import EtfPage from "../etfs/[symbol]/page"
import NewsPage from "../news/page"
import HomePage from "../page"
import StockPage from "../stocks/[symbol]/page"
import WatchlistPage from "../watchlists/[id]/page"

describe("market route smoke tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(getCurrentViewer).mockResolvedValue({
      email: "markets@example.test",
      id: "user_123",
      name: "Markets Tester",
    } as Awaited<ReturnType<typeof getCurrentViewer>>)

    vi.mocked(getMarketOverviewData).mockResolvedValue({
      calendar: [],
      economicCalendar: [],
      generalNews: [],
      indexes: [],
      indexSparklines: {},
      macro: [],
      marketHours: [],
      marketHolidays: [],
      movers: [
        {
          items: [],
          label: "Leaders",
        },
      ],
      news: [],
      plan: {} as never,
      riskPremium: null,
      sectorHistory: [],
      sectorValuations: [],
      sectors: [],
      warnings: [],
      watchlist: {
        id: "wl_1",
        name: "Core",
        quotes: [],
        sparklines: {},
      },
    })

    vi.mocked(getLatestGeneralMarketNews).mockResolvedValue([])
    vi.mocked(getLatestMarketNews).mockResolvedValue([])
    vi.mocked(getLatestSecActivity).mockResolvedValue([])
    vi.mocked(getLatestInsiderFeed).mockResolvedValue([])
    vi.mocked(resolveTickerInstrumentKind).mockResolvedValue("stock")
    vi.mocked(getEtfDossier).mockResolvedValue({
      aftermarket: null,
      chart: [],
      countryAllocations: [],
      dividendHistory: [],
      dividendSnapshot: null,
      generatedAt: "2026-03-28T00:00:00.000Z",
      holdings: [],
      info: {
        assetClass: "Equity",
        assets: 84_450_000_000,
        beta: 0.71,
        category: "Large Value",
        currency: "USD",
        description: "ETF summary",
        dividendPerShare: 1.06,
        dividendYield: 0.0346,
        domicile: "United States",
        exchange: "NYSEARCA",
        exDividendDate: "2026-03-25",
        expenseRatio: 0.0006,
        frequency: "Quarterly",
        inceptionDate: "2011-10-20",
        indexTracked: "Dow Jones U.S. Dividend 100 Index",
        name: "Schwab US Dividend Equity ETF",
        nav: 30.56,
        peRatio: 17.61,
        provider: "Charles Schwab",
        region: "North America",
        sharesOutstanding: 2_780_000_000,
        symbol: "SCHD",
        totalHoldings: 104,
        website: null,
      },
      intradayCharts: {
        "5min": [],
      },
      news: [],
      plan: {
        historicalRangeLabel: "5 years",
      } as never,
      priceChange: null,
      quote: {
        avgVolume: null,
        change: 0.05,
        changesPercentage: 0.16,
        currency: "USD",
        dayHigh: 30.64,
        dayLow: 30.38,
        exchange: "NYSEARCA",
        marketCap: 84_450_000_000,
        name: "Schwab US Dividend Equity ETF",
        open: 30.46,
        price: 30.56,
        priceAvg50: null,
        priceAvg200: null,
        symbol: "SCHD",
        timestamp: null,
        volume: 20_625_291,
        yearHigh: 31.95,
        yearLow: 23.87,
      },
      sectorAllocations: [],
      symbol: "SCHD",
    })
    vi.mocked(getMultiAssetSnapshot).mockResolvedValue({
      groups: [],
      plan: {} as never,
    })
    vi.mocked(getStockPriceHistoryIntradayChart).mockResolvedValue([])
    vi.mocked(getStockDossier).mockResolvedValue({
      aftermarket: null,
      analyst: {
        grades: [],
        ratingSummary: null,
        targetConsensus: null,
        targetHigh: null,
        targetLow: null,
      },
      analystEstimates: [],
      calendar: [],
      chart: [],
      dividendSnapshot: {
        dividendPerShareTtm: 1.04,
        dividendYieldTtm: 0.0041,
        frequency: "quarterly",
        latestDeclarationDate: null,
        latestDividendDate: "2026-02-09",
        latestDividendPerShare: null,
        latestDividendYield: null,
        latestPaymentDate: null,
        latestRecordDate: null,
        dividendPayoutRatioTtm: null,
      },
      employeeHistory: [],
      etfExposure: [],
      executives: [],
      filings: [],
      financialScores: null,
      generatedAt: "2026-03-28T00:00:00.000Z",
      geographicSegments: null,
      gradesConsensus: {
        buy: null,
        consensus: null,
        hold: null,
        sell: null,
        strongBuy: null,
        strongSell: null,
      },
      growth: [],
      headlineStats: [],
      insiderTrades: [],
      intradayCharts: {
        "5min": [],
      },
      keyMetrics: [],
      lockedSections: [],
      marketCapHistory: [],
      news: [],
      ownership: [],
      peers: [],
      plan: {
        historicalRangeLabel: "5 years",
      } as never,
      priceChange: null,
      productSegments: null,
      profile: {
        beta: null,
        ceo: "Tim Cook",
        city: "Cupertino",
        country: "United States",
        description: "Apple description",
        industry: "Consumer Electronics",
        marketCap: null,
        sector: "Technology",
        state: "CA",
        website: "https://apple.com",
      } as never,
      quote: {
        avgVolume: null,
        change: null,
        changesPercentage: null,
        currency: "USD",
        dayHigh: null,
        dayLow: null,
        exchange: "NASDAQ",
        marketCap: null,
        name: "Apple Inc.",
        open: null,
        price: null,
        priceAvg50: null,
        priceAvg200: null,
        symbol: "AAPL",
        timestamp: null,
        volume: null,
        yearHigh: null,
        yearLow: null,
      },
      ratingsHistory: [],
      ratingsMetrics: [],
      ratioMetrics: [],
      secProfile: null,
      shareFloat: null,
      statements: [],
      symbol: "AAPL",
      technicals: [],
      valuation: null,
    })
    vi.mocked(getWatchlistPageData).mockResolvedValue({
      plan: {
        watchlistLimit: 25,
      } as never,
      rows: [],
      status: "ok",
      watchlist: {
        createdAt: "2026-03-28T00:00:00.000Z",
        id: "wl_1",
        name: "Core",
        symbols: ["AAPL", "MSFT"],
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
    })
    vi.mocked(getStockDossierOverview).mockResolvedValue({
      chart: [],
      dividendSnapshot: null,
      generatedAt: "2026-03-28T00:00:00.000Z",
      headlineStats: [],
      keyMetrics: [],
      lockedSections: [],
      plan: {
        historicalRangeLabel: "5 years",
      } as never,
      profile: null,
      quote: {
        avgVolume: null,
        change: null,
        changesPercentage: null,
        currency: "USD",
        dayHigh: null,
        dayLow: null,
        exchange: "NASDAQ",
        marketCap: null,
        name: "Apple Inc.",
        open: null,
        price: null,
        priceAvg50: null,
        priceAvg200: null,
        symbol: "AAPL",
        timestamp: null,
        volume: null,
        yearHigh: null,
        yearLow: null,
      },
      ratingsMetrics: [],
      ratioMetrics: [],
      symbol: "AAPL",
      valuation: null,
    })
  })

  it("renders the home page with degraded empty states", async () => {
    const html = renderToStaticMarkup(await HomePage())

    expect(html).toContain("Market overview")
    expect(html).toContain("Market Snapshot")
    expect(html).toContain("Cross-Asset + Macro")
    expect(html).toContain("Catalysts + News")
    expect(html).toContain("No quotes available")
    expect(html).toContain("No multi-asset coverage yet")
    expect(html).toContain("No sector snapshot")
    expect(html).toContain("No market news")
  })

  it("renders the news page with empty feeds", async () => {
    const html = renderToStaticMarkup(await NewsPage())

    expect(html).toContain("Market news")
    expect(html).toContain("No market news")
  })

  it("renders the watchlist page without a compare CTA", async () => {
    const html = renderToStaticMarkup(
      await WatchlistPage({
        params: Promise.resolve({
          id: "wl_1",
        }),
      })
    )

    expect(html).toContain("Core")
    expect(html).not.toContain("/compare?symbols=")
  })

  it("renders the stock page without throwing when optional sections are empty", async () => {
    const html = renderToStaticMarkup(
      await StockPage({
        params: Promise.resolve({
          symbol: "AAPL",
        }),
      })
    )

    expect(html).toContain("About AAPL")
    expect(html).toContain("News")
    expect(html).toContain("Apple description")
    expect(html).toContain("Dividend")
    expect(html).toContain("Free Float")
    expect(html).toContain("50-Day Avg")
    expect(html).not.toContain("Show more")
  })

  it("renders the ETF overview page without throwing when holdings and news are empty", async () => {
    const html = renderToStaticMarkup(
      await EtfPage({
        params: Promise.resolve({
          symbol: "SCHD",
        }),
      })
    )

    expect(html).toContain("Top Holdings")
    expect(html).toContain("About SCHD")
    expect(html).toContain("No market news")
  })
})
