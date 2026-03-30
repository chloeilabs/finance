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
  getLatestInsiderFeed: vi.fn(),
  getLatestMarketNews: vi.fn(),
  getLatestSecActivity: vi.fn(),
  getMarketCalendarFeed: vi.fn(),
  getMarketOverviewData: vi.fn(),
  getMarketsSnapshot: vi.fn(),
  getMultiAssetSnapshot: vi.fn(),
  getStockDossierOverview: vi.fn(),
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

import { getCurrentViewer } from "@/lib/server/auth-session"
import {
  getLatestInsiderFeed,
  getLatestMarketNews,
  getLatestSecActivity,
  getMarketCalendarFeed,
  getMarketOverviewData,
  getMarketsSnapshot,
  getMultiAssetSnapshot,
  getStockDossierOverview,
} from "@/lib/server/markets/service"

import AssetsPage from "../assets/page"
import CalendarPage from "../calendar/page"
import MarketsPage from "../markets/page"
import NewsPage from "../news/page"
import HomePage from "../page"
import StockPage from "../stocks/[symbol]/page"

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

    vi.mocked(getMarketsSnapshot).mockResolvedValue({
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
      plan: {} as never,
      riskPremium: null,
      sectorHistory: [],
      sectorValuations: [],
      sectors: [],
    } as Awaited<ReturnType<typeof getMarketsSnapshot>>)

    vi.mocked(getLatestMarketNews).mockResolvedValue([])
    vi.mocked(getLatestSecActivity).mockResolvedValue([])
    vi.mocked(getLatestInsiderFeed).mockResolvedValue([])
    vi.mocked(getMultiAssetSnapshot).mockResolvedValue({
      groups: [],
      plan: {} as never,
    })
    vi.mocked(getMarketCalendarFeed).mockResolvedValue([])
    vi.mocked(getStockDossierOverview).mockResolvedValue({
      chart: [],
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
    expect(html).toContain("No quotes available")
    expect(html).toContain("No sector snapshot")
    expect(html).toContain("No market news")
  })

  it("renders the markets page with fallback sections", async () => {
    const html = renderToStaticMarkup(await MarketsPage())

    expect(html).toContain("Broad market snapshot")
    expect(html).toContain("No quotes available")
    expect(html).toContain("No movers available")
    expect(html).toContain("No market news")
  })

  it("renders the news page with empty feeds", async () => {
    const html = renderToStaticMarkup(await NewsPage())

    expect(html).toContain("Market news")
    expect(html).toContain("No market news")
  })

  it("renders the calendar page with an empty state", async () => {
    const html = renderToStaticMarkup(await CalendarPage())

    expect(html).toContain("Upcoming catalysts")
    expect(html).toContain("No scheduled events")
  })

  it("renders the assets page with an empty asset grid", async () => {
    const html = renderToStaticMarkup(await AssetsPage())

    expect(html).toContain("Cross-asset starter coverage")
    expect(html).toContain("No multi-asset coverage yet")
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
  })
})
