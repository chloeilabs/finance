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
  SectorHistorySeries,
  SectorValuationSnapshot,
} from "@/lib/shared/markets/intelligence"

import { mayUseLiveFmp, withMarketCache } from "./cache"
import { getQuoteCacheTtlSeconds, isCapabilityEnabled } from "./config"
import { createMarketDateClock } from "./market-clock"
import {
  CALENDAR_TTL_SECONDS,
  client,
  CORE_ECONOMIC_INDICATORS,
  CORE_INDEX_SYMBOLS,
  CORE_MARKET_EXCHANGES,
  CORE_SECTOR_HISTORY,
  CORE_WATCHLIST_SYMBOLS,
  dedupeCalendarEvents,
  dedupeNews,
  ECONOMIC_INDICATORS_TTL_SECONDS,
  EOD_TTL_SECONDS,
  getCachedQuoteSnapshot,
  getEodChartCacheKey,
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
    [...CORE_INDEX_SYMBOLS],
    QUOTE_FETCH_CONCURRENCY,
    (symbol) => getCachedQuoteSnapshot(symbol)
  )

  return quotes.filter((quote): quote is QuoteSnapshot => quote !== null)
}

async function getTreasurySnapshot(): Promise<MacroRate[]> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: `macro:treasury:${clock.today}`,
    category: "macro",
    ttlSeconds: TREASURY_TTL_SECONDS,
    fallback: [] as MacroRate[],
    allowLive: isCapabilityEnabled("economics"),
    staleOnError: true,
    fetcher: async () => (await client.macro.getTreasuryRates()).slice(0, 3),
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

async function getSectorValuationSnapshot(): Promise<
  SectorValuationSnapshot[]
> {
  const clock = createMarketDateClock()

  return withMarketCache({
    cacheKey: `sector-pe:${clock.today}`,
    category: "breadth",
    ttlSeconds: SECTOR_TTL_SECONDS,
    fallback: [] as SectorValuationSnapshot[],
    staleOnError: true,
    fetcher: () => client.breadth.getSectorPeSnapshot(clock.today),
  })
}

async function getSectorHistorySnapshot(): Promise<SectorHistorySeries[]> {
  const clock = createMarketDateClock()

  const series = await Promise.all(
    CORE_SECTOR_HISTORY.map((sector) =>
      withMarketCache({
        cacheKey: `sector-history:${sector}:${clock.today}`,
        category: "breadth",
        ttlSeconds: SECTOR_TTL_SECONDS,
        fallback: [] as SectorHistorySeries["points"],
        staleOnError: true,
        fetcher: () => client.breadth.getHistoricalSectorPerformance(sector),
      }).then((points) => ({
        sector,
        points: points.slice(-10),
      }))
    )
  )

  return series
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

function toSparklineValues(points: PricePoint[]): number[] {
  return points.flatMap((point) =>
    typeof point.close === "number" && Number.isFinite(point.close)
      ? [point.close]
      : []
  )
}

async function getSparklineForSymbol(symbol: string): Promise<number[]> {
  const points = await withMarketCache({
    cacheKey: getEodChartCacheKey(symbol, "compact"),
    category: "chart",
    ttlSeconds: EOD_TTL_SECONDS,
    fallback: [] as PricePoint[],
    staleOnError: true,
    fetcher: () => client.charts.getEodChart(symbol, { limit: 30 }),
  })

  return toSparklineValues(points.slice(-30))
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
    indexSparklines,
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
    sectorHistory,
    riskPremium,
  ] = await Promise.all([
    getQuotesForSymbols(watchlistSymbols),
    getSparklinesForSymbols(watchlistSymbols),
    getOverviewIndexQuotes(),
    getSparklinesForSymbols([...CORE_INDEX_SYMBOLS]),
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
    getSectorHistorySnapshot(),
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
    indexSparklines,
    movers,
    sectors: sectors.slice(0, 8),
    sectorValuations: sectorValuations.slice(0, 8),
    sectorHistory,
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
