import "server-only"

import type {
  CalendarEvent,
  MacroRate,
  NewsStory,
  PricePoint,
  QuoteSnapshot,
} from "@/lib/shared/markets/core"
import type {
  MarketHoliday,
  MarketHoursSnapshot,
  MarketOverviewData,
  RiskPremiumSnapshot,
  SectorValuationSnapshot,
} from "@/lib/shared/markets/intelligence"
import type { FmpIntradayInterval } from "@/lib/shared/markets/plan"

import { mayUseLiveFmp, withMarketCache } from "./cache"
import {
  getFmpIntradayIntervals,
  getQuoteCacheTtlSeconds,
  isCapabilityEnabled,
} from "./config"
import { createMarketDateClock } from "./market-clock"
import {
  CALENDAR_TTL_SECONDS,
  client,
  CORE_ECONOMIC_INDICATORS,
  CORE_MARKET_EXCHANGES,
  CORE_WATCHLIST_SYMBOLS,
  dedupeCalendarEvents,
  dedupeNews,
  ECONOMIC_INDICATORS_TTL_SECONDS,
  EOD_TTL_SECONDS,
  getCachedQuoteSnapshot,
  getIntradayChartCacheKey,
  mapWithConcurrency,
  MARKET_STRUCTURE_TTL_SECONDS,
  MOVERS_TTL_SECONDS,
  NEWS_TTL_SECONDS,
  normalizeSymbols,
  primeCachedQuoteSnapshot,
  QUOTE_FETCH_CONCURRENCY,
  RISK_PREMIUM_TTL_SECONDS,
  SECTOR_TTL_SECONDS,
  setCachedQuoteSnapshot,
  TREASURY_TTL_SECONDS,
} from "./service-support"
import { setCachedMarketPayload } from "./store"
import { getMarketSidebarData } from "./workspace"

const SPARKLINE_INTRADAY_INTERVAL_PREFERENCE: readonly FmpIntradayInterval[] = [
  "5min",
  "1min",
  "15min",
  "30min",
  "1hour",
  "4hour",
]
export const OVERVIEW_BENCHMARK_SYMBOLS = [
  "^GSPC",
  "^IXIC",
  "^DJI",
  "BTCUSD",
] as const

async function getOverviewIndexQuotes(): Promise<QuoteSnapshot[]> {
  if (isCapabilityEnabled("batchIndexQuotes")) {
    return withMarketCache({
      cacheKey: "overview:indexes",
      category: "quotes",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: [] as QuoteSnapshot[],
      staleOnError: true,
      fetcher: () => client.quotes.getIndexQuotes(),
    })
  }

  const quotes = await mapWithConcurrency(
    [...OVERVIEW_BENCHMARK_SYMBOLS],
    QUOTE_FETCH_CONCURRENCY,
    (symbol) => getCachedQuoteSnapshot(symbol)
  )

  return quotes.filter((quote): quote is QuoteSnapshot => quote !== null)
}

async function getTreasurySnapshot(): Promise<MacroRate[]> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: `macro:treasury:v2:${clock.today}`,
    category: "macro",
    ttlSeconds: TREASURY_TTL_SECONDS,
    fallback: [] as MacroRate[],
    allowLive: isCapabilityEnabled("economics"),
    staleOnError: true,
    fetcher: async () => (await client.macro.getTreasuryRates()).slice(0, 4),
  })
}

async function getEconomicIndicatorSnapshot(): Promise<MacroRate[]> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: `macro:indicators:${clock.today}`,
    category: "macro",
    ttlSeconds: ECONOMIC_INDICATORS_TTL_SECONDS,
    fallback: [] as MacroRate[],
    allowLive: isCapabilityEnabled("economics"),
    staleOnError: true,
    fetcher: () =>
      client.macro.getEconomicIndicators([...CORE_ECONOMIC_INDICATORS]),
  })
}

async function getMacroSnapshot(): Promise<MacroRate[]> {
  const [treasury, indicators] = await Promise.all([
    getTreasurySnapshot(),
    getEconomicIndicatorSnapshot(),
  ])

  return [...treasury, ...indicators]
}

async function getEconomicCalendarSnapshot(): Promise<CalendarEvent[]> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: `macro:calendar:${clock.today}:${clock.plusDays(14)}`,
    category: "macro",
    ttlSeconds: CALENDAR_TTL_SECONDS,
    fallback: [] as CalendarEvent[],
    allowLive: isCapabilityEnabled("economics"),
    staleOnError: true,
    fetcher: () =>
      client.macro.getEconomicCalendar(clock.today, clock.plusDays(14)),
  })
}

async function getMarketHoursSnapshot(): Promise<MarketHoursSnapshot[]> {
  const clock = createMarketDateClock()

  const results = await Promise.all(
    CORE_MARKET_EXCHANGES.map((exchange) =>
      withMarketCache({
        cacheKey: `market-hours:${exchange}:${clock.today}`,
        category: "market-structure",
        ttlSeconds: MARKET_STRUCTURE_TTL_SECONDS,
        fallback: null as MarketHoursSnapshot | null,
        staleOnError: true,
        fetcher: () => client.marketStructure.getExchangeMarketHours(exchange),
      })
    )
  )

  return results.filter((item): item is MarketHoursSnapshot => item !== null)
}

async function getMarketHolidaySnapshot(): Promise<MarketHoliday[]> {
  const clock = createMarketDateClock()

  const results = await Promise.all(
    CORE_MARKET_EXCHANGES.map((exchange) =>
      withMarketCache({
        cacheKey: `market-holidays:${exchange}:${clock.today}`,
        category: "market-structure",
        ttlSeconds: MARKET_STRUCTURE_TTL_SECONDS,
        fallback: [] as MarketHoliday[],
        staleOnError: true,
        fetcher: async () => {
          const items =
            await client.marketStructure.getHolidaysByExchange(exchange)

          return items
            .filter((item) => item.date && item.date >= clock.today)
            .slice(0, 2)
        },
      })
    )
  )

  return results.flat()
}

export async function getLatestAvailableSectorValuations(params: {
  clock: Pick<ReturnType<typeof createMarketDateClock>, "today" | "minusDays">
  fetchSnapshot: (date: string) => Promise<SectorValuationSnapshot[]>
  maxLookbackDays?: number
}): Promise<SectorValuationSnapshot[]> {
  const maxLookbackDays = params.maxLookbackDays ?? 7

  for (let daysAgo = 0; daysAgo < maxLookbackDays; daysAgo += 1) {
    const date = daysAgo === 0 ? params.clock.today : params.clock.minusDays(daysAgo)
    const snapshot = await params.fetchSnapshot(date)

    if (snapshot.some((item) => item.pe !== null)) {
      return snapshot
    }
  }

  return []
}

async function getSectorValuationSnapshot(): Promise<
  SectorValuationSnapshot[]
> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: `sector-pe:v2:${clock.today}`,
    category: "breadth",
    ttlSeconds: SECTOR_TTL_SECONDS,
    fallback: [] as SectorValuationSnapshot[],
    staleOnError: true,
    fetcher: () =>
      getLatestAvailableSectorValuations({
        clock,
        fetchSnapshot: (date) => client.breadth.getSectorPeSnapshot(date),
      }),
  })
}

async function getMarketRiskPremiumSnapshot(): Promise<RiskPremiumSnapshot | null> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: `market-risk-premium:${clock.today}`,
    category: "macro",
    ttlSeconds: RISK_PREMIUM_TTL_SECONDS,
    fallback: null,
    allowLive: isCapabilityEnabled("economics"),
    staleOnError: true,
    fetcher: () => client.macro.getMarketRiskPremium(),
  })
}

async function getLatestSectorPerformanceSnapshot(): Promise<
  MarketOverviewData["sectors"]
> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: `overview:sectors:${clock.today}`,
    category: "sectors",
    ttlSeconds: SECTOR_TTL_SECONDS,
    fallback: [] as MarketOverviewData["sectors"],
    staleOnError: true,
    fetcher: async () => {
      for (let daysAgo = 0; daysAgo < 7; daysAgo += 1) {
        const snapshot = await client.quotes.getSectorPerformance(
          clock.minusDays(daysAgo)
        )

        if (snapshot.some((entry) => entry.changePercentage !== null)) {
          return snapshot
        }
      }

      return []
    },
  })
}

async function getQuotesForSymbols(
  symbols: string[]
): Promise<QuoteSnapshot[]> {
  const normalized = normalizeSymbols(symbols)

  if (normalized.length === 0) {
    return []
  }

  if (!isCapabilityEnabled("batchQuotes")) {
    const quotes = await mapWithConcurrency(
      normalized,
      QUOTE_FETCH_CONCURRENCY,
      (symbol) => getCachedQuoteSnapshot(symbol)
    )

    return quotes.filter((quote): quote is QuoteSnapshot => quote !== null)
  }

  return withMarketCache({
    cacheKey: `quotes:${normalized.join(",")}`,
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    fallback: [] as QuoteSnapshot[],
    staleOnError: true,
    fetcher: () => client.quotes.getBatchQuotes(normalized),
  })
}

export function getSparklineIntradayInterval(
  availableIntervals: readonly FmpIntradayInterval[]
): FmpIntradayInterval | null {
  for (const interval of SPARKLINE_INTRADAY_INTERVAL_PREFERENCE) {
    if (availableIntervals.includes(interval)) {
      return interval
    }
  }

  return null
}

export function getIntradaySparklineValuesForDate(
  points: PricePoint[],
  marketDate: string
): number[] {
  return points.flatMap((point) =>
    point.date.startsWith(marketDate) &&
    typeof point.close === "number" &&
    Number.isFinite(point.close)
      ? [point.close]
      : []
  )
}

export function getIntradaySparklineMarketDate(
  points: PricePoint[],
  preferredMarketDate: string
): string | null {
  const preferredPoints = getIntradaySparklineValuesForDate(
    points,
    preferredMarketDate
  )

  if (preferredPoints.length >= 2) {
    return preferredMarketDate
  }

  for (const point of points) {
    if (
      typeof point.close === "number" &&
      Number.isFinite(point.close) &&
      point.date.length >= 10
    ) {
      return point.date.slice(0, 10)
    }
  }

  return null
}

async function getSparklineForSymbol(symbol: string): Promise<number[]> {
  if (!isCapabilityEnabled("intradayCharts")) {
    return []
  }

  const interval = getSparklineIntradayInterval(getFmpIntradayIntervals())

  if (!interval) {
    return []
  }

  const clock = createMarketDateClock()
  const points = await withMarketCache({
    cacheKey: getIntradayChartCacheKey(symbol, interval),
    category: "chart",
    ttlSeconds: EOD_TTL_SECONDS,
    fallback: [] as PricePoint[],
    allowLive: true,
    staleOnError: true,
    fetcher: () => client.charts.getIntradayChart(symbol, interval),
  })

  const marketDate = getIntradaySparklineMarketDate(points, clock.today)

  if (!marketDate) {
    return []
  }

  return getIntradaySparklineValuesForDate(points, marketDate)
}

async function getSparklinesForSymbols(
  symbols: string[]
): Promise<Record<string, number[]>> {
  const normalized = normalizeSymbols(symbols)

  if (normalized.length === 0) {
    return {}
  }

  const entries = await mapWithConcurrency(
    normalized,
    QUOTE_FETCH_CONCURRENCY,
    async (symbol) => [symbol, await getSparklineForSymbol(symbol)] as const
  )

  return Object.fromEntries(entries)
}

export async function primeQuoteCacheForSymbols(
  symbols: string[]
): Promise<QuoteSnapshot[]> {
  const normalized = normalizeSymbols(symbols)

  if (normalized.length === 0 || !(await mayUseLiveFmp())) {
    return []
  }

  if (!isCapabilityEnabled("batchQuotes")) {
    const quotes = await mapWithConcurrency(
      normalized,
      QUOTE_FETCH_CONCURRENCY,
      (symbol) => primeCachedQuoteSnapshot(symbol)
    )

    return quotes.filter((quote): quote is QuoteSnapshot => quote !== null)
  }

  const quotes = await client.quotes.getBatchQuotes(normalized)
  await setCachedMarketPayload({
    cacheKey: `quotes:${normalized.join(",")}`,
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    payload: quotes,
  }).catch(() => undefined)
  await Promise.all(quotes.map((quote) => setCachedQuoteSnapshot(quote)))

  return quotes
}

export async function getMarketOverviewData(
  userId: string
): Promise<MarketOverviewData> {
  const clock = createMarketDateClock()
  const { plan, watchlists, warnings } = await getMarketSidebarData(userId)
  const primaryWatchlist = watchlists[0]
  const watchlistSymbols = primaryWatchlist?.symbols ?? [
    ...CORE_WATCHLIST_SYMBOLS,
  ]
  const [
    watchlistQuotes,
    watchlistSparklines,
    indexes,
    movers,
    sectors,
    earnings,
    dividends,
    macro,
    news,
    generalNews,
    economicCalendar,
    marketHours,
    marketHolidays,
    sectorValuations,
    riskPremium,
  ] = await Promise.all([
    getQuotesForSymbols(watchlistSymbols),
    getSparklinesForSymbols(watchlistSymbols),
    getOverviewIndexQuotes(),
    withMarketCache({
      cacheKey: "overview:movers",
      category: "quotes",
      ttlSeconds: MOVERS_TTL_SECONDS,
      fallback: [],
      staleOnError: true,
      fetcher: () => client.quotes.getMovers(),
    }),
    getLatestSectorPerformanceSnapshot(),
    withMarketCache({
      cacheKey: `calendar:earnings:${clock.today}:${clock.plusDays(7)}`,
      category: "calendar",
      ttlSeconds: CALENDAR_TTL_SECONDS,
      fallback: [] as CalendarEvent[],
      staleOnError: true,
      fetcher: () =>
        client.calendar.getEarningsCalendar(clock.today, clock.plusDays(7)),
    }),
    withMarketCache({
      cacheKey: `calendar:dividends:${clock.today}:${clock.plusDays(7)}`,
      category: "calendar",
      ttlSeconds: CALENDAR_TTL_SECONDS,
      fallback: [] as CalendarEvent[],
      staleOnError: true,
      fetcher: () =>
        client.calendar.getDividendsCalendar(clock.today, clock.plusDays(7)),
    }),
    getMacroSnapshot(),
    withMarketCache({
      cacheKey: `news:latest:${clock.today}`,
      category: "news",
      ttlSeconds: NEWS_TTL_SECONDS,
      fallback: [] as NewsStory[],
      staleOnError: true,
      fetcher: () => client.news.getLatestStockNews(12),
    }),
    getLatestGeneralMarketNews(8),
    getEconomicCalendarSnapshot(),
    getMarketHoursSnapshot(),
    getMarketHolidaySnapshot(),
    getSectorValuationSnapshot(),
    getMarketRiskPremiumSnapshot(),
  ])

  return {
    plan,
    watchlist: {
      id: primaryWatchlist?.id ?? null,
      name: primaryWatchlist?.name ?? "Core",
      quotes: watchlistQuotes,
      sparklines: watchlistSparklines,
    },
    indexes,
    movers,
    sectors,
    sectorValuations,
    calendar: dedupeCalendarEvents([...earnings, ...dividends])
      .sort((left, right) => left.eventDate.localeCompare(right.eventDate))
      .slice(0, 10),
    macro,
    economicCalendar: dedupeCalendarEvents(economicCalendar).slice(0, 10),
    marketHours,
    marketHolidays: marketHolidays.slice(0, 6),
    riskPremium,
    news: dedupeNews(news).slice(0, 10),
    generalNews: dedupeNews(generalNews).slice(0, 8),
    warnings,
  }
}

export async function getLatestMarketNews(limit = 24): Promise<NewsStory[]> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: ["news", "latest", clock.today, String(limit)].join(":"),
    category: "news",
    ttlSeconds: NEWS_TTL_SECONDS,
    fallback: [] as NewsStory[],
    staleOnError: true,
    fetcher: () => client.news.getLatestStockNews(limit),
  })
}

export async function getLatestGeneralMarketNews(
  limit = 8
): Promise<NewsStory[]> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: ["news", "general", clock.today, String(limit)].join(":"),
    category: "news",
    ttlSeconds: NEWS_TTL_SECONDS,
    fallback: [] as NewsStory[],
    staleOnError: true,
    fetcher: async () =>
      dedupeNews(await client.news.getLatestGeneralNews(limit)),
  })
}
