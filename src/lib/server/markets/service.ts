import "server-only"

import type {
  AftermarketSnapshot,
  AnalystEstimateSnapshot,
  CalendarEvent,
  ComparePageData,
  EmployeeCountPoint,
  FinancialScoreSnapshot,
  FmpCapabilityKey,
  FmpIntradayInterval,
  GradesConsensus,
  LockedMarketSection,
  MacroRate,
  MarketCapPoint,
  MarketHoliday,
  MarketHoursSnapshot,
  MarketOverviewData,
  MarketPlanSummary,
  MarketScreenerSortKey,
  MarketSearchResult,
  MetricStat,
  NewsStory,
  PeerComparisonRow,
  PriceChangeSnapshot,
  QuoteSnapshot,
  RatingsHistoricalEntry,
  ResearchQuoteRow,
  RevenueSegmentation,
  RiskPremiumSnapshot,
  SavedScreenerRecord,
  ScreenerFilterState,
  ScreenerOptions,
  SecProfile,
  SectorHistorySeries,
  SectorValuationSnapshot,
  StatementTable,
  StockDossier,
  SymbolDirectoryEntry,
  TechnicalIndicatorSeries,
  WatchlistRecord,
  WatchlistResearchData,
} from "@/lib/shared"

import { createFmpClient, FmpRequestError } from "./client"
import {
  getFmpSoftMinuteLimit,
  getMarketPlanSummary,
  getQuoteCacheTtlSeconds,
  isCapabilityEnabled,
  isFmpConfigured,
} from "./config"
import {
  countSymbolDirectoryEntries,
  createWatchlistForUser,
  deleteSavedScreenerForUser,
  ensureDefaultWatchlistForUser,
  getCachedMarketPayload,
  getMarketApiUsageForCurrentMinute,
  getMarketApiUsageForToday,
  getSymbolDirectoryEntry,
  getWatchlistForUser,
  listSavedScreenersForUser,
  listWatchlistsForUser,
  replaceWatchlistSymbols,
  searchSymbolDirectory,
  setCachedMarketPayload,
  upsertSavedScreenerForUser,
  upsertSymbolDirectoryEntries,
} from "./store"

const CORE_WATCHLIST_SYMBOLS = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "META",
  "TSLA",
  "GOOGL",
  "BRK.B",
] as const

const BASIC_SOFT_DAILY_LIMIT = 240
const NEWS_TTL_SECONDS = 60 * 5
const PROFILE_TTL_SECONDS = 60 * 60 * 24
const CALENDAR_TTL_SECONDS = 60 * 60
const EOD_TTL_SECONDS = 60 * 15
const FILINGS_TTL_SECONDS = 60 * 60
const ANALYST_TTL_SECONDS = 60 * 30
const INSIDER_TTL_SECONDS = 60 * 3
const MARKET_STRUCTURE_TTL_SECONDS = 60 * 30
const TECHNICAL_TTL_SECONDS = 60 * 15
const TREASURY_TTL_SECONDS = 60 * 60 * 2
const ECONOMIC_INDICATORS_TTL_SECONDS = 60 * 60 * 4
const MOVERS_TTL_SECONDS = 60 * 3
const SECTOR_TTL_SECONDS = 60 * 60
const RISK_PREMIUM_TTL_SECONDS = 60 * 60 * 12
const QUOTE_FETCH_CONCURRENCY = 4
const EOD_CHART_CACHE_VERSION = "v2"
const INTRADAY_CHART_CACHE_VERSION = "v1"
const CORE_INDEX_SYMBOLS = ["^GSPC", "^IXIC", "^DJI", "^RUT"] as const
const CORE_ECONOMIC_INDICATORS = [
  "GDP",
  "CPI",
  "Unemployment Rate",
] as const
const CORE_MARKET_EXCHANGES = ["NASDAQ", "NYSE", "AMEX"] as const
const CORE_SECTOR_HISTORY = [
  "Technology",
  "Healthcare",
  "Financial Services",
  "Energy",
] as const
const COMPARE_SYMBOL_LIMIT = 5

const client = createFmpClient()

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"
  )
}

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function plusDaysIsoDate(days: number) {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function minusDaysIsoDate(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

async function mayUseLiveFmp() {
  if (!isFmpConfigured()) {
    return false
  }

  const softMinuteLimit = getFmpSoftMinuteLimit()

  if (softMinuteLimit !== null) {
    const usage = await getMarketApiUsageForCurrentMinute("fmp").catch(() => 0)
    return usage < softMinuteLimit
  }

  const usage = await getMarketApiUsageForToday("fmp").catch(() => 0)
  return usage < BASIC_SOFT_DAILY_LIMIT
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (items.length === 0) {
    return []
  }

  const results = new Array<R>(items.length)
  let nextIndex = 0

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex
        nextIndex += 1
        const item = items[currentIndex]

        if (item === undefined) {
          break
        }

        results[currentIndex] = await mapper(item, currentIndex)
      }
    })
  )

  return results
}

async function withMarketCache<T>(params: {
  cacheKey: string
  category: string
  ttlSeconds: number
  fallback: T
  allowLive?: boolean
  fetcher: () => Promise<T>
}): Promise<T> {
  const cached = await getCachedMarketPayload<T>(params.cacheKey).catch(
    () => undefined
  )

  if (cached !== undefined) {
    return cached
  }

  const allowLive = params.allowLive ?? true

  if (!allowLive || !(await mayUseLiveFmp())) {
    return params.fallback
  }

  try {
    const value = await params.fetcher()
    await setCachedMarketPayload({
      cacheKey: params.cacheKey,
      category: params.category,
      ttlSeconds: params.ttlSeconds,
      payload: value,
    }).catch(() => undefined)
    return value
  } catch (error) {
    if (error instanceof FmpRequestError) {
      return params.fallback
    }

    throw error
  }
}

function buildLockedSection(
  title: string,
  capability: FmpCapabilityKey,
  description: string
): LockedMarketSection {
  return { title, capability, description }
}

function compactMetricStats(groups: MetricStat[][]): MetricStat[] {
  return groups.flat().filter((item) => item.value !== null)
}

function compactTables(tables: (StatementTable | null)[]): StatementTable[] {
  return tables.filter((table): table is StatementTable => table !== null)
}

function dedupeNews(stories: NewsStory[]): NewsStory[] {
  const seen = new Set<string>()

  return stories.filter((story) => {
    if (seen.has(story.id)) {
      return false
    }

    seen.add(story.id)
    return true
  })
}

function dedupeCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
  const seen = new Set<string>()

  return events.filter((event) => {
    const key = [
      event.eventType,
      event.symbol,
      event.name,
      event.eventDate,
      event.time ?? "",
      event.value ?? "",
      event.estimate ?? "",
    ].join(":")

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

function normalizeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map(normalizeSymbol).filter(Boolean))]
}

function getQuoteCacheKey(symbol: string): string {
  return `quote:${normalizeSymbol(symbol)}`
}

function getEodChartCacheKey(symbol: string): string {
  return `stock:${normalizeSymbol(symbol)}:eod-chart:${EOD_CHART_CACHE_VERSION}`
}

function getIntradayChartCacheKey(
  symbol: string,
  interval: FmpIntradayInterval
): string {
  return [
    "stock",
    normalizeSymbol(symbol),
    "intraday-chart",
    interval,
    INTRADAY_CHART_CACHE_VERSION,
  ].join(":")
}

async function setCachedQuoteSnapshot(quote: QuoteSnapshot): Promise<void> {
  await setCachedMarketPayload({
    cacheKey: getQuoteCacheKey(quote.symbol),
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    payload: quote,
  }).catch(() => undefined)
}

async function getCachedQuoteSnapshot(symbol: string): Promise<QuoteSnapshot | null> {
  const normalizedSymbol = normalizeSymbol(symbol)

  if (!normalizedSymbol) {
    return null
  }

  return withMarketCache({
    cacheKey: getQuoteCacheKey(normalizedSymbol),
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    fallback: null,
    fetcher: () => client.quotes.getQuote(normalizedSymbol),
  })
}

async function primeCachedQuoteSnapshot(
  symbol: string
): Promise<QuoteSnapshot | null> {
  const normalizedSymbol = normalizeSymbol(symbol)

  if (!normalizedSymbol || !(await mayUseLiveFmp())) {
    return null
  }

  try {
    const quote = await client.quotes.getQuote(normalizedSymbol)

    if (!quote) {
      return null
    }

    await setCachedQuoteSnapshot(quote)
    return quote
  } catch (error) {
    if (error instanceof FmpRequestError) {
      return null
    }

    throw error
  }
}

async function getOverviewIndexQuotes(): Promise<QuoteSnapshot[]> {
  if (isCapabilityEnabled("batchIndexQuotes")) {
    return withMarketCache({
      cacheKey: "overview:indexes",
      category: "quotes",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: [] as QuoteSnapshot[],
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
  return withMarketCache({
    cacheKey: `macro:treasury:${todayIsoDate()}`,
    category: "macro",
    ttlSeconds: TREASURY_TTL_SECONDS,
    fallback: [] as MacroRate[],
    allowLive: isCapabilityEnabled("economics"),
    fetcher: async () => (await client.macro.getTreasuryRates()).slice(0, 3),
  })
}

async function getEconomicIndicatorSnapshot(): Promise<MacroRate[]> {
  return withMarketCache({
    cacheKey: `macro:indicators:${todayIsoDate()}`,
    category: "macro",
    ttlSeconds: ECONOMIC_INDICATORS_TTL_SECONDS,
    fallback: [] as MacroRate[],
    allowLive: isCapabilityEnabled("economics"),
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
  return withMarketCache({
    cacheKey: `macro:calendar:${todayIsoDate()}:${plusDaysIsoDate(14)}`,
    category: "macro",
    ttlSeconds: CALENDAR_TTL_SECONDS,
    fallback: [] as CalendarEvent[],
    allowLive: isCapabilityEnabled("economics"),
    fetcher: () =>
      client.macro.getEconomicCalendar(todayIsoDate(), plusDaysIsoDate(14)),
  })
}

async function getMarketHoursSnapshot(): Promise<MarketHoursSnapshot[]> {
  const results = await Promise.all(
    CORE_MARKET_EXCHANGES.map((exchange) =>
      withMarketCache({
        cacheKey: `market-hours:${exchange}:${todayIsoDate()}`,
        category: "market-structure",
        ttlSeconds: MARKET_STRUCTURE_TTL_SECONDS,
        fallback: null as MarketHoursSnapshot | null,
        fetcher: () => client.marketStructure.getExchangeMarketHours(exchange),
      })
    )
  )

  return results.filter(
    (item): item is MarketHoursSnapshot => item !== null
  )
}

async function getMarketHolidaySnapshot(): Promise<MarketHoliday[]> {
  const results = await Promise.all(
    CORE_MARKET_EXCHANGES.map((exchange) =>
      withMarketCache({
        cacheKey: `market-holidays:${exchange}:${todayIsoDate()}`,
        category: "market-structure",
        ttlSeconds: MARKET_STRUCTURE_TTL_SECONDS,
        fallback: [] as MarketHoliday[],
        fetcher: async () => {
          const items = await client.marketStructure.getHolidaysByExchange(
            exchange
          )

          return items
            .filter((item) => item.date && item.date >= todayIsoDate())
            .slice(0, 2)
        },
      })
    )
  )

  return results.flat()
}

async function getSectorValuationSnapshot(): Promise<SectorValuationSnapshot[]> {
  return withMarketCache({
    cacheKey: `sector-pe:${todayIsoDate()}`,
    category: "breadth",
    ttlSeconds: SECTOR_TTL_SECONDS,
    fallback: [] as SectorValuationSnapshot[],
    fetcher: () => client.breadth.getSectorPeSnapshot(todayIsoDate()),
  })
}

async function getSectorHistorySnapshot(): Promise<SectorHistorySeries[]> {
  const series = await Promise.all(
    CORE_SECTOR_HISTORY.map((sector) =>
      withMarketCache({
        cacheKey: `sector-history:${sector}:${todayIsoDate()}`,
        category: "breadth",
        ttlSeconds: SECTOR_TTL_SECONDS,
        fallback: [] as SectorHistorySeries["points"],
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
  return withMarketCache({
    cacheKey: `market-risk-premium:${todayIsoDate()}`,
    category: "macro",
    ttlSeconds: RISK_PREMIUM_TTL_SECONDS,
    fallback: null,
    allowLive: isCapabilityEnabled("economics"),
    fetcher: () => client.macro.getMarketRiskPremium(),
  })
}

async function getLatestSectorPerformanceSnapshot(): Promise<
  MarketOverviewData["sectors"]
> {
  return withMarketCache({
    cacheKey: `overview:sectors:${todayIsoDate()}`,
    category: "sectors",
    ttlSeconds: SECTOR_TTL_SECONDS,
    fallback: [] as MarketOverviewData["sectors"],
    fetcher: async () => {
      for (let daysAgo = 0; daysAgo < 7; daysAgo += 1) {
        const snapshot = await client.quotes.getSectorPerformance(
          minusDaysIsoDate(daysAgo)
        )

        if (snapshot.some((entry) => entry.changePercentage !== null)) {
          return snapshot
        }
      }

      return []
    },
  })
}

async function seedSymbolDirectoryIfNeeded(): Promise<void> {
  if (!(await mayUseLiveFmp())) {
    return
  }

  const count = await countSymbolDirectoryEntries().catch((error: unknown) => {
    if (isUndefinedTableError(error)) {
      return 0
    }

    throw error
  })

  if (count > 250) {
    return
  }

  const [activeSymbols, etfs] = await Promise.all([
    client.directory.listActivelyTrading().catch(() => []),
    client.directory.listEtfs().catch(() => []),
  ])

  await upsertSymbolDirectoryEntries([...activeSymbols, ...etfs]).catch(
    () => undefined
  )
}

async function hydrateSearchResultsIntoDirectory(
  results: MarketSearchResult[]
): Promise<void> {
  const entries: SymbolDirectoryEntry[] = results.map((result) => ({
    ...result,
    country: null,
    isActivelyTrading: true,
    isEtf: /etf/i.test(result.type ?? ""),
    updatedAt: new Date().toISOString(),
  }))

  await upsertSymbolDirectoryEntries(entries).catch(() => undefined)
}

export async function getMarketSidebarData(userId: string): Promise<{
  plan: MarketPlanSummary
  watchlists: WatchlistRecord[]
  warnings: string[]
}> {
  const plan = getMarketPlanSummary()
  const warnings: string[] = []

  if (!isFmpConfigured()) {
    warnings.push("FMP_API_KEY is not configured. Market data will stay empty.")
  }

  try {
    const watchlists = await listWatchlistsForUser(userId)

    if (watchlists.length > 0) {
      return { plan, watchlists, warnings }
    }

    const defaultWatchlist = await ensureDefaultWatchlistForUser(userId, [
      ...CORE_WATCHLIST_SYMBOLS,
    ])

    return { plan, watchlists: [defaultWatchlist], warnings }
  } catch (error) {
    if (isUndefinedTableError(error)) {
      warnings.push(
        "Market tables are not initialized. Run `pnpm markets:migrate`."
      )
      return { plan, watchlists: [], warnings }
    }

    throw error
  }
}

export async function searchMarketSymbols(
  query: string
): Promise<MarketSearchResult[]> {
  const normalizedQuery = query.trim()

  if (!normalizedQuery) {
    return []
  }

  await seedSymbolDirectoryIfNeeded()

  const localResults = await searchSymbolDirectory({
    query: normalizedQuery,
    limit: 10,
  }).catch(() => [])

  if (localResults.length > 0) {
    return localResults.map((entry) => ({
      symbol: entry.symbol,
      name: entry.name,
      exchange: entry.exchange,
      exchangeShortName: entry.exchangeShortName,
      type: entry.type,
      currency: entry.currency,
      sector: entry.sector,
      industry: entry.industry,
    }))
  }

  if (!(await mayUseLiveFmp())) {
    return []
  }

  const liveResults = await withMarketCache({
    cacheKey: `search:${normalizedQuery.toLowerCase()}`,
    category: "directory-search",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as MarketSearchResult[],
    fetcher: () => client.directory.searchSymbols(normalizedQuery),
  })

  await hydrateSearchResultsIntoDirectory(liveResults)
  return liveResults
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
    fetcher: () => client.quotes.getBatchQuotes(normalized),
  })
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
  const { plan, watchlists, warnings } = await getMarketSidebarData(userId)
  const primaryWatchlist = watchlists[0]
  const [
    watchlistQuotes,
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
    sectorHistory,
    riskPremium,
  ] = await Promise.all([
    getQuotesForSymbols(
      primaryWatchlist?.symbols ?? [...CORE_WATCHLIST_SYMBOLS]
    ),
    getOverviewIndexQuotes(),
    withMarketCache({
      cacheKey: "overview:movers",
      category: "quotes",
      ttlSeconds: MOVERS_TTL_SECONDS,
      fallback: [],
      fetcher: () => client.quotes.getMovers(),
    }),
    getLatestSectorPerformanceSnapshot(),
    withMarketCache({
      cacheKey: `calendar:earnings:${todayIsoDate()}:${plusDaysIsoDate(7)}`,
      category: "calendar",
      ttlSeconds: CALENDAR_TTL_SECONDS,
      fallback: [] as CalendarEvent[],
      fetcher: () =>
        client.calendar.getEarningsCalendar(todayIsoDate(), plusDaysIsoDate(7)),
    }),
    withMarketCache({
      cacheKey: `calendar:dividends:${todayIsoDate()}:${plusDaysIsoDate(7)}`,
      category: "calendar",
      ttlSeconds: CALENDAR_TTL_SECONDS,
      fallback: [] as CalendarEvent[],
      fetcher: () =>
        client.calendar.getDividendsCalendar(
          todayIsoDate(),
          plusDaysIsoDate(7)
        ),
    }),
    getMacroSnapshot(),
    withMarketCache({
      cacheKey: `news:latest:${todayIsoDate()}`,
      category: "news",
      ttlSeconds: NEWS_TTL_SECONDS,
      fallback: [] as NewsStory[],
      fetcher: () => client.news.getLatestStockNews(12),
    }),
    withMarketCache({
      cacheKey: `news:general:${todayIsoDate()}`,
      category: "news",
      ttlSeconds: NEWS_TTL_SECONDS,
      fallback: [] as NewsStory[],
      fetcher: () => client.news.getLatestGeneralNews(8),
    }),
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
    },
    indexes,
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
  return withMarketCache({
    cacheKey: ["news", "latest", todayIsoDate(), String(limit)].join(":"),
    category: "news",
    ttlSeconds: NEWS_TTL_SECONDS,
    fallback: [] as NewsStory[],
    fetcher: () => client.news.getLatestStockNews(limit),
  })
}

export async function getMarketCalendarFeed(): Promise<CalendarEvent[]> {
  const [earnings, dividends, economic] = await Promise.all([
    withMarketCache({
      cacheKey: `calendar:earnings:${todayIsoDate()}:${plusDaysIsoDate(14)}`,
      category: "calendar",
      ttlSeconds: CALENDAR_TTL_SECONDS,
      fallback: [] as CalendarEvent[],
      fetcher: () =>
        client.calendar.getEarningsCalendar(
          todayIsoDate(),
          plusDaysIsoDate(14)
        ),
    }),
    withMarketCache({
      cacheKey: `calendar:dividends:${todayIsoDate()}:${plusDaysIsoDate(14)}`,
      category: "calendar",
      ttlSeconds: CALENDAR_TTL_SECONDS,
      fallback: [] as CalendarEvent[],
      fetcher: () =>
        client.calendar.getDividendsCalendar(
          todayIsoDate(),
          plusDaysIsoDate(14)
        ),
    }),
    getEconomicCalendarSnapshot(),
  ])

  return dedupeCalendarEvents([...earnings, ...dividends, ...economic]).sort(
    (left, right) => left.eventDate.localeCompare(right.eventDate)
  )
}

export async function getMarketsSnapshot() {
  const [
    indexes,
    movers,
    sectors,
    macro,
    economicCalendar,
    marketHours,
    marketHolidays,
    sectorValuations,
    sectorHistory,
    riskPremium,
    generalNews,
  ] = await Promise.all([
    getOverviewIndexQuotes(),
    withMarketCache({
      cacheKey: "overview:movers",
      category: "quotes",
      ttlSeconds: MOVERS_TTL_SECONDS,
      fallback: [],
      fetcher: () => client.quotes.getMovers(),
    }),
    getLatestSectorPerformanceSnapshot(),
    getMacroSnapshot(),
    getEconomicCalendarSnapshot(),
    getMarketHoursSnapshot(),
    getMarketHolidaySnapshot(),
    getSectorValuationSnapshot(),
    getSectorHistorySnapshot(),
    getMarketRiskPremiumSnapshot(),
    withMarketCache({
      cacheKey: `news:general:${todayIsoDate()}`,
      category: "news",
      ttlSeconds: NEWS_TTL_SECONDS,
      fallback: [] as NewsStory[],
      fetcher: () => client.news.getLatestGeneralNews(8),
    }),
  ])

  return {
    plan: getMarketPlanSummary(),
    indexes,
    movers,
    sectors,
    macro,
    economicCalendar: dedupeCalendarEvents(economicCalendar).slice(0, 10),
    marketHours,
    marketHolidays: marketHolidays.slice(0, 6),
    sectorValuations: sectorValuations.slice(0, 8),
    sectorHistory,
    riskPremium,
    generalNews: dedupeNews(generalNews).slice(0, 8),
  }
}

function getMetricNumberByLabel(
  metrics: MetricStat[],
  label: string
): number | null {
  const metric = metrics.find((item) => item.label === label)
  return typeof metric?.value === "number" ? metric.value : null
}

async function getIntradayCharts(
  symbol: string
): Promise<Partial<Record<FmpIntradayInterval, StockDossier["chart"]>>> {
  const intervals: FmpIntradayInterval[] = ["5min", "15min", "30min", "1hour"]
  const results = await Promise.all(
    intervals.map(async (interval) => {
      const points = await withMarketCache({
        cacheKey: getIntradayChartCacheKey(symbol, interval),
        category: "chart",
        ttlSeconds: EOD_TTL_SECONDS,
        fallback: [] as StockDossier["chart"],
        allowLive: isCapabilityEnabled("intradayCharts"),
        fetcher: () => client.charts.getIntradayChart(symbol, interval),
      })

      return [interval, points] as const
    })
  )

  return Object.fromEntries(
    results.filter(([, points]) => points.length > 0)
  ) as Partial<Record<FmpIntradayInterval, StockDossier["chart"]>>
}

async function getStockAftermarketSnapshot(
  symbol: string
): Promise<AftermarketSnapshot | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:aftermarket`,
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    fallback: null,
    fetcher: () => client.quotes.getAftermarketSnapshot(symbol),
  })
}

async function getStockPriceChangeSnapshot(
  symbol: string
): Promise<PriceChangeSnapshot | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:price-change`,
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    fallback: null,
    fetcher: () => client.quotes.getPriceChange(symbol),
  })
}

async function getStockTechnicals(
  symbol: string
): Promise<TechnicalIndicatorSeries[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:technicals`,
    category: "technicals",
    ttlSeconds: TECHNICAL_TTL_SECONDS,
    fallback: [] as TechnicalIndicatorSeries[],
    allowLive: isCapabilityEnabled("intradayCharts"),
    fetcher: () => client.technicals.getCoreIndicators(symbol),
  })
}

async function getStockFinancialScores(
  symbol: string
): Promise<FinancialScoreSnapshot | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:financial-scores`,
    category: "fundamentals",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    fetcher: () => client.fundamentals.getFinancialScores(symbol),
  })
}

async function getStockGradesConsensus(
  symbol: string
): Promise<GradesConsensus | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:grades-consensus`,
    category: "analyst",
    ttlSeconds: ANALYST_TTL_SECONDS,
    fallback: null,
    allowLive: isCapabilityEnabled("analystInsights"),
    fetcher: () => client.analyst.getGradesConsensus(symbol),
  })
}

async function getStockAnalystEstimates(
  symbol: string
): Promise<AnalystEstimateSnapshot[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:analyst-estimates`,
    category: "analyst",
    ttlSeconds: ANALYST_TTL_SECONDS,
    fallback: [] as AnalystEstimateSnapshot[],
    allowLive: isCapabilityEnabled("analystInsights"),
    fetcher: () => client.analyst.getAnalystEstimates(symbol),
  })
}

async function getStockRatingsHistory(
  symbol: string
): Promise<RatingsHistoricalEntry[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:ratings-history`,
    category: "analyst",
    ttlSeconds: ANALYST_TTL_SECONDS,
    fallback: [] as RatingsHistoricalEntry[],
    fetcher: () => client.analyst.getRatingsHistorical(symbol),
  })
}

async function getStockProductSegments(
  symbol: string
): Promise<RevenueSegmentation | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:product-segments`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    fetcher: () => client.company.getProductSegmentation(symbol),
  })
}

async function getStockGeographicSegments(
  symbol: string
): Promise<RevenueSegmentation | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:geographic-segments`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    fetcher: () => client.company.getGeographicSegmentation(symbol),
  })
}

async function getStockMarketCapHistory(
  symbol: string
): Promise<MarketCapPoint[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:market-cap-history`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as MarketCapPoint[],
    fetcher: async () => (await client.company.getMarketCapHistory(symbol)).slice(-20),
  })
}

async function getStockEmployeeHistory(
  symbol: string
): Promise<EmployeeCountPoint[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:employee-history`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as EmployeeCountPoint[],
    fetcher: async () => {
      const history = await client.company.getEmployeeHistory(symbol)
      const latest = await client.company.getLatestEmployeeCount(symbol).catch(
        () => null
      )

      const items = latest ? [...history, latest] : history
      const seen = new Set<string>()

      return items.filter((item) => {
        const key = item.periodOfReport ?? item.acceptanceTime ?? ""

        if (seen.has(key)) {
          return false
        }

        seen.add(key)
        return true
      })
    },
  })
}

async function getStockSecProfile(symbol: string): Promise<SecProfile | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:sec-profile`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    allowLive: isCapabilityEnabled("secFilings"),
    fetcher: () => client.company.getSecProfile(symbol),
  })
}

async function getPeerComparisonRows(
  symbols: string[]
): Promise<PeerComparisonRow[]> {
  const normalized = normalizeSymbols(symbols).slice(0, COMPARE_SYMBOL_LIMIT)

  const rows = await mapWithConcurrency(
    normalized,
    QUOTE_FETCH_CONCURRENCY,
    async (symbol) => {
      const [profile, quote, ratios, keyMetrics, scores, analyst] =
        await Promise.all([
          withMarketCache({
            cacheKey: `stock:${symbol}:profile`,
            category: "profile",
            ttlSeconds: PROFILE_TTL_SECONDS,
            fallback: null,
            fetcher: () => client.company.getProfile(symbol),
          }),
          getCachedQuoteSnapshot(symbol),
          withMarketCache({
            cacheKey: `stock:${symbol}:ratios`,
            category: "fundamentals",
            ttlSeconds: PROFILE_TTL_SECONDS,
            fallback: [] as MetricStat[],
            fetcher: () => client.fundamentals.getRatiosTtm(symbol),
          }),
          withMarketCache({
            cacheKey: `stock:${symbol}:key-metrics`,
            category: "fundamentals",
            ttlSeconds: PROFILE_TTL_SECONDS,
            fallback: [] as MetricStat[],
            fetcher: () => client.fundamentals.getKeyMetricsTtm(symbol),
          }),
          getStockFinancialScores(symbol),
          withMarketCache({
            cacheKey: `stock:${symbol}:analyst`,
            category: "analyst",
            ttlSeconds: ANALYST_TTL_SECONDS,
            fallback: null,
            allowLive: isCapabilityEnabled("analystInsights"),
            fetcher: () => client.analyst.getSummary(symbol),
          }),
        ])

      return {
        symbol,
        companyName: profile?.companyName ?? quote?.name ?? null,
        price: quote?.price ?? null,
        changesPercentage: quote?.changesPercentage ?? null,
        marketCap: profile?.marketCap ?? quote?.marketCap ?? null,
        peRatio: getMetricNumberByLabel(ratios, "P / E"),
        fcfYield: getMetricNumberByLabel(keyMetrics, "FCF Yield"),
        roic: getMetricNumberByLabel(keyMetrics, "ROIC"),
        altmanZScore: scores?.altmanZScore ?? null,
        piotroskiScore: scores?.piotroskiScore ?? null,
        analystConsensus: analyst?.ratingSummary ?? null,
      } satisfies PeerComparisonRow
    }
  )

  return rows
}

async function getStockPeerComparison(symbol: string): Promise<PeerComparisonRow[]> {
  const peers = await withMarketCache({
    cacheKey: `stock:${symbol}:peers`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as string[],
    fetcher: () => client.company.getPeers(symbol),
  })

  return getPeerComparisonRows([symbol, ...peers.slice(0, COMPARE_SYMBOL_LIMIT - 1)])
}

async function buildResearchRows(symbols: string[]): Promise<ResearchQuoteRow[]> {
  const normalized = normalizeSymbols(symbols)

  return mapWithConcurrency(
    normalized,
    QUOTE_FETCH_CONCURRENCY,
    async (symbol) => {
      const [quote, technicals, earnings, analyst, scores] = await Promise.all([
        getCachedQuoteSnapshot(symbol),
        getStockTechnicals(symbol),
        withMarketCache({
          cacheKey: `stock:${symbol}:earnings`,
          category: "calendar",
          ttlSeconds: CALENDAR_TTL_SECONDS,
          fallback: [] as CalendarEvent[],
          fetcher: () => client.calendar.getEarnings(symbol),
        }),
        withMarketCache({
          cacheKey: `stock:${symbol}:analyst`,
          category: "analyst",
          ttlSeconds: ANALYST_TTL_SECONDS,
          fallback: null,
          allowLive: isCapabilityEnabled("analystInsights"),
          fetcher: () => client.analyst.getSummary(symbol),
        }),
        getStockFinancialScores(symbol),
      ])

      const rsiSeries = technicals.find((item) => item.id === "rsi14")
      const nextEarnings = earnings
        .filter((item) => item.eventDate >= todayIsoDate())
        .sort((left, right) => left.eventDate.localeCompare(right.eventDate))[0]

      return {
        symbol,
        name: quote?.name ?? null,
        currency: quote?.currency ?? null,
        price: quote?.price ?? null,
        changesPercentage: quote?.changesPercentage ?? null,
        marketCap: quote?.marketCap ?? null,
        rsi14: rsiSeries?.points[rsiSeries.points.length - 1]?.value ?? null,
        nextEarningsDate: nextEarnings?.eventDate ?? null,
        analystConsensus: analyst?.ratingSummary ?? null,
        piotroskiScore: scores?.piotroskiScore ?? null,
        altmanZScore: scores?.altmanZScore ?? null,
      } satisfies ResearchQuoteRow
    }
  )
}

function resolveLockedSections(plan: MarketPlanSummary): LockedMarketSection[] {
  const locked: LockedMarketSection[] = []

  if (!plan.capabilities.analystInsights) {
    locked.push(
      buildLockedSection(
        "Analyst",
        "analystInsights",
        "Upgrade for analyst grades, price target consensus, and richer estimate coverage."
      )
    )
  }

  if (!plan.capabilities.insiderTrades) {
    locked.push(
      buildLockedSection(
        "Insider",
        "insiderTrades",
        "Upgrade for insider activity and ownership flow context."
      )
    )
  }

  if (!plan.capabilities.ownership) {
    locked.push(
      buildLockedSection(
        "Ownership",
        "ownership",
        "Upgrade for institutional ownership and 13F analytics."
      )
    )
  }

  if (!plan.capabilities.etfAssetExposure) {
    locked.push(
      buildLockedSection(
        "ETF Context",
        "etfAssetExposure",
        "Upgrade for ETF asset exposure look-through."
      )
    )
  }

  if (!plan.capabilities.pressReleases) {
    locked.push(
      buildLockedSection(
        "Press Releases",
        "pressReleases",
        "Upgrade for official company press releases and announcement search."
      )
    )
  }

  if (!plan.capabilities.dcf) {
    locked.push(
      buildLockedSection(
        "DCF",
        "dcf",
        "Upgrade for discounted cash flow valuation surfaces."
      )
    )
  }

  return locked
}

async function getStockOverviewCore(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
  const [
    profile,
    quote,
    chart,
    keyMetrics,
    ratioMetrics,
    ratings,
    valuation,
  ] = await Promise.all([
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:profile`,
      category: "profile",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: null,
      fetcher: () => client.company.getProfile(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:quote`,
      category: "quotes",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: null,
      fetcher: () => client.quotes.getQuote(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: getEodChartCacheKey(normalizedSymbol),
      category: "chart",
      ttlSeconds: EOD_TTL_SECONDS,
      fallback: [] as StockDossier["chart"],
      fetcher: () => client.charts.getEodChart(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:key-metrics`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as MetricStat[],
      fetcher: () => client.fundamentals.getKeyMetricsTtm(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:ratios`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as MetricStat[],
      fetcher: () => client.fundamentals.getRatiosTtm(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:ratings`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as MetricStat[],
      fetcher: () => client.fundamentals.getRatingsSnapshot(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:valuation`,
      category: "valuation",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: null,
      allowLive: true,
      fetcher: () => client.valuation.getSnapshot(normalizedSymbol),
    }),
  ])

  const fallbackDirectoryEntry = await getSymbolDirectoryEntry(
    normalizedSymbol
  ).catch(() => null)

  return {
    profile:
      profile ??
      (fallbackDirectoryEntry
        ? {
            symbol: fallbackDirectoryEntry.symbol,
            companyName: fallbackDirectoryEntry.name,
            exchangeShortName: fallbackDirectoryEntry.exchangeShortName,
            sector: fallbackDirectoryEntry.sector,
            industry: fallbackDirectoryEntry.industry,
            website: null,
            description: null,
            ceo: null,
            country: fallbackDirectoryEntry.country,
            city: null,
            state: null,
            employees: null,
            ipoDate: null,
            beta: null,
            marketCap: null,
            image: null,
          }
        : null),
    quote,
    chart,
    headlineStats: compactMetricStats([
      keyMetrics,
      ratioMetrics,
      ratings,
    ]).slice(0, 10),
    valuation,
  }
}

export async function getStockDossierOverview(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
  const plan = getMarketPlanSummary()
  const overview = await getStockOverviewCore(normalizedSymbol)

  return {
    symbol: normalizedSymbol,
    generatedAt: new Date().toISOString(),
    plan,
    lockedSections: resolveLockedSections(plan),
    ...overview,
  }
}

export async function getStockDossierTradingSection(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
  const [intradayCharts, aftermarket, priceChange, technicals] =
    await Promise.all([
      getIntradayCharts(normalizedSymbol),
      getStockAftermarketSnapshot(normalizedSymbol),
      getStockPriceChangeSnapshot(normalizedSymbol),
      getStockTechnicals(normalizedSymbol),
    ])

  return {
    intradayCharts,
    aftermarket,
    priceChange,
    technicals,
  }
}

export async function getStockDossierFinancialSection(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
  const [incomeStatement, balanceSheet, cashFlow, growth] = await Promise.all([
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:income`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: null,
      fetcher: () => client.fundamentals.getIncomeStatement(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:balance`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: null,
      fetcher: () => client.fundamentals.getBalanceSheet(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:cash-flow`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: null,
      fetcher: () => client.fundamentals.getCashFlow(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:growth`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as MetricStat[],
      fetcher: () => client.fundamentals.getGrowth(normalizedSymbol),
    }),
  ])

  return {
    statements: compactTables([incomeStatement, balanceSheet, cashFlow]),
    growth: growth.filter((item) => item.value !== null),
  }
}

export async function getStockDossierContextSection(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
  const latestNewsKey = `stock:${normalizedSymbol}:news:${todayIsoDate()}`
  const filingsFrom = plusDaysIsoDate(-180)
  const filingsTo = plusDaysIsoDate(0)
  const [dividends, earnings, splits, companyNews, secFilings] =
    await Promise.all([
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:dividends`,
        category: "calendar",
        ttlSeconds: CALENDAR_TTL_SECONDS,
        fallback: [] as CalendarEvent[],
        fetcher: () => client.calendar.getDividends(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:earnings`,
        category: "calendar",
        ttlSeconds: CALENDAR_TTL_SECONDS,
        fallback: [] as CalendarEvent[],
        fetcher: () => client.calendar.getEarnings(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:splits`,
        category: "calendar",
        ttlSeconds: CALENDAR_TTL_SECONDS,
        fallback: [] as CalendarEvent[],
        fetcher: () => client.calendar.getSplits(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: latestNewsKey,
        category: "news",
        ttlSeconds: NEWS_TTL_SECONDS,
        fallback: [] as NewsStory[],
        fetcher: () => client.news.getStockNews(normalizedSymbol, 10),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:filings:${filingsFrom}:${filingsTo}`,
        category: "filings",
        ttlSeconds: FILINGS_TTL_SECONDS,
        fallback: [] as StockDossier["filings"],
        allowLive: isCapabilityEnabled("secFilings"),
        fetcher: () =>
          client.filings.getSecFilings(
            normalizedSymbol,
            filingsFrom,
            filingsTo
          ),
      }),
    ])

  return {
    calendar: dedupeCalendarEvents([...earnings, ...dividends, ...splits])
      .sort((left, right) => right.eventDate.localeCompare(left.eventDate))
      .slice(0, 10),
    news: dedupeNews(companyNews).slice(0, 12),
    filings: secFilings.slice(0, 10),
  }
}

export async function getStockDossierStreetViewSection(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
  const [
    analyst,
    gradesConsensus,
    analystEstimates,
    ratingsHistory,
    financialScores,
    insiderTrades,
    ownership,
    etfExposure,
  ] = await Promise.all([
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:analyst`,
      category: "analyst",
      ttlSeconds: ANALYST_TTL_SECONDS,
      fallback: null,
      allowLive: isCapabilityEnabled("analystInsights"),
      fetcher: () => client.analyst.getSummary(normalizedSymbol),
    }),
    getStockGradesConsensus(normalizedSymbol),
    getStockAnalystEstimates(normalizedSymbol),
    getStockRatingsHistory(normalizedSymbol),
    getStockFinancialScores(normalizedSymbol),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:insider`,
      category: "insider",
      ttlSeconds: INSIDER_TTL_SECONDS,
      fallback: [] as StockDossier["insiderTrades"],
      allowLive: isCapabilityEnabled("insiderTrades"),
      fetcher: () => client.insider.getInsiderTrades(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:ownership`,
      category: "ownership",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as StockDossier["ownership"],
      allowLive: isCapabilityEnabled("ownership"),
      fetcher: () =>
        client.ownership.getInstitutionalOwnership(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:etf-exposure`,
      category: "etf",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as StockDossier["etfExposure"],
      allowLive: isCapabilityEnabled("etfAssetExposure"),
      fetcher: () => client.etf.getAssetExposure(normalizedSymbol),
    }),
  ])

  return {
    analyst,
    gradesConsensus,
    analystEstimates,
    ratingsHistory,
    financialScores,
    insiderTrades: insiderTrades.slice(0, 8),
    ownership: ownership.slice(0, 8),
    etfExposure: etfExposure.slice(0, 8),
  }
}

export async function getStockDossierBusinessSection(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
  const [
    productSegments,
    geographicSegments,
    marketCapHistory,
    employeeHistory,
    secProfile,
    peers,
  ] = await Promise.all([
    getStockProductSegments(normalizedSymbol),
    getStockGeographicSegments(normalizedSymbol),
    getStockMarketCapHistory(normalizedSymbol),
    getStockEmployeeHistory(normalizedSymbol),
    getStockSecProfile(normalizedSymbol),
    getStockPeerComparison(normalizedSymbol),
  ])

  return {
    productSegments,
    geographicSegments,
    marketCapHistory,
    employeeHistory,
    secProfile,
    peers,
  }
}

export async function getStockDossier(symbol: string): Promise<StockDossier> {
  const overview = await getStockDossierOverview(symbol)
  const [trading, financial, context, streetView, business] =
    await Promise.all([
      getStockDossierTradingSection(overview.symbol),
      getStockDossierFinancialSection(overview.symbol),
      getStockDossierContextSection(overview.symbol),
      getStockDossierStreetViewSection(overview.symbol),
      getStockDossierBusinessSection(overview.symbol),
    ])

  return {
    ...overview,
    ...trading,
    ...financial,
    ...context,
    ...streetView,
    ...business,
  }
}

export async function getWatchlistPageData(params: {
  userId: string
  watchlistId: string
}): Promise<WatchlistResearchData> {
  const watchlist = await getWatchlistForUser(
    params.userId,
    params.watchlistId
  ).catch((error: unknown) => {
    if (isUndefinedTableError(error)) {
      return null
    }

    throw error
  })

  return {
    watchlist,
    rows: await buildResearchRows(watchlist?.symbols ?? []),
    plan: getMarketPlanSummary(),
  }
}

function toScreenerParams(filters: ScreenerFilterState) {
  return {
    marketCapMoreThan: filters.marketCapMin,
    marketCapLowerThan: filters.marketCapMax,
    betaMoreThan: filters.betaMin,
    betaLowerThan: filters.betaMax,
    volumeMoreThan: filters.volumeMin,
    volumeLowerThan: filters.volumeMax,
    dividendMoreThan: filters.dividendMin,
    dividendLowerThan: filters.dividendMax,
    priceMoreThan: filters.priceMin,
    priceLowerThan: filters.priceMax,
    isActivelyTrading: filters.isActivelyTrading,
    isEtf: filters.isEtf,
    sector: filters.sector,
    industry: filters.industry,
    exchange: filters.exchange,
    limit: 25,
  }
}

function getScreenerSortValue(
  result: MarketSearchResult,
  sortBy: MarketScreenerSortKey
) {
  switch (sortBy) {
    case "symbol":
      return result.symbol
    case "marketCap":
      return result.marketCap ?? Number.NEGATIVE_INFINITY
    case "price":
      return result.price ?? Number.NEGATIVE_INFINITY
    case "volume":
      return result.volume ?? Number.NEGATIVE_INFINITY
    case "beta":
      return result.beta ?? Number.NEGATIVE_INFINITY
    case "dividend":
      return result.dividend ?? Number.NEGATIVE_INFINITY
  }
}

function sortScreenerResults(results: MarketSearchResult[], filters: ScreenerFilterState) {
  const sortBy = filters.sortBy ?? "marketCap"
  const direction = filters.sortDirection ?? "desc"

  return [...results].sort((left, right) => {
    const leftValue = getScreenerSortValue(left, sortBy)
    const rightValue = getScreenerSortValue(right, sortBy)

    if (typeof leftValue === "string" && typeof rightValue === "string") {
      return direction === "asc"
        ? leftValue.localeCompare(rightValue)
        : rightValue.localeCompare(leftValue)
    }

    const leftNumber =
      typeof leftValue === "number" ? leftValue : Number.NEGATIVE_INFINITY
    const rightNumber =
      typeof rightValue === "number" ? rightValue : Number.NEGATIVE_INFINITY

    return direction === "asc"
      ? leftNumber - rightNumber
      : rightNumber - leftNumber
  })
}

export async function runMarketScreener(
  filters: ScreenerFilterState
): Promise<MarketSearchResult[]> {
  const cacheKey = `screener:${JSON.stringify(filters)}`

  const results = await withMarketCache({
    cacheKey,
    category: "screener",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as MarketSearchResult[],
    fetcher: () => client.directory.screenCompanies(toScreenerParams(filters)),
  })

  return sortScreenerResults(results, filters)
}

export async function saveMarketScreener(params: {
  userId: string
  name: string
  filters: ScreenerFilterState
}): Promise<SavedScreenerRecord> {
  return upsertSavedScreenerForUser(params)
}

export async function deleteSavedMarketScreener(params: {
  userId: string
  screenerId: string
}): Promise<void> {
  return deleteSavedScreenerForUser(params.userId, params.screenerId)
}

export async function getMarketScreenerOptions(): Promise<ScreenerOptions> {
  const [exchanges, sectors, industries] = await Promise.all([
    withMarketCache({
      cacheKey: "directory:exchanges",
      category: "directory",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as string[],
      fetcher: () => client.directory.listExchanges(),
    }),
    withMarketCache({
      cacheKey: "directory:sectors",
      category: "directory",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as string[],
      fetcher: () => client.directory.listSectors(),
    }),
    withMarketCache({
      cacheKey: "directory:industries",
      category: "directory",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as string[],
      fetcher: () => client.directory.listIndustries(),
    }),
  ])

  return {
    exchanges,
    sectors,
    industries,
  }
}

export async function getComparePageData(
  symbols: string[]
): Promise<ComparePageData> {
  const normalized = normalizeSymbols(symbols).slice(0, COMPARE_SYMBOL_LIMIT)

  return {
    symbols: normalized,
    entries: await getPeerComparisonRows(normalized),
    generatedAt: new Date().toISOString(),
  }
}

export async function getSavedMarketScreeners(
  userId: string
): Promise<SavedScreenerRecord[]> {
  return listSavedScreenersForUser(userId).catch((error: unknown) => {
    if (isUndefinedTableError(error)) {
      return []
    }

    throw error
  })
}

export async function updateWatchlistSymbolsForUser(params: {
  userId: string
  watchlistId: string
  symbols: string[]
}): Promise<WatchlistRecord | null> {
  const limitedSymbols = params.symbols
    .map(normalizeSymbol)
    .filter(Boolean)
    .slice(0, getMarketPlanSummary().watchlistLimit)

  return replaceWatchlistSymbols({
    userId: params.userId,
    watchlistId: params.watchlistId,
    symbols: limitedSymbols,
  }).catch((error: unknown) => {
    if (isUndefinedTableError(error)) {
      return null
    }

    throw error
  })
}

export async function createNewWatchlistForUser(params: {
  userId: string
  name: string
  symbols?: string[]
}) {
  return createWatchlistForUser({
    ...params,
    symbols: params.symbols
      ?.map(normalizeSymbol)
      .filter(Boolean)
      .slice(0, getMarketPlanSummary().watchlistLimit),
  })
}
