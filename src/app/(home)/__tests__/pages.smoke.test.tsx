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
  getLatestGeneralMarketNews: vi.fn(),
  getLatestInsiderFeed: vi.fn(),
  getLatestMarketNews: vi.fn(),
  getLatestSecActivity: vi.fn(),
  getMarketOverviewData: vi.fn(),
  getMultiAssetSnapshot: vi.fn(),
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
  getLatestGeneralMarketNews,
  getLatestInsiderFeed,
  getLatestMarketNews,
  getLatestSecActivity,
  getMarketOverviewData,
  getMultiAssetSnapshot,
  getStockDossierOverview,
  getStockPriceHistoryIntradayChart,
  getWatchlistPageData,
} from "@/lib/server/markets/service"

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
    vi.mocked(getMultiAssetSnapshot).mockResolvedValue({
      groups: [],
      plan: {} as never,
    })
    vi.mocked(getStockPriceHistoryIntradayChart).mockResolvedValue([])
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
      symbol: "AAPL",
      valuation: null,
    })
  })

  it("renders the home page with degraded empty states", async () => {
    const html = renderToStaticMarkup(await HomePage())

    expect(html).toContain("Market overview")
    expect(html).toContain("My Market")
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

    expect(html).toContain("Apple Inc.")
    expect(html).toContain("No metrics available")
    expect(html).toContain("No valuation snapshot")
    expect(html).not.toContain("/compare?symbols=")
  })
})
