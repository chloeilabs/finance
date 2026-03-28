import "server-only"

import type {
  CalendarEvent,
  FmpCapabilityKey,
  LockedMarketSection,
  MarketOverviewData,
  MarketPlanSummary,
  MarketSearchResult,
  MetricStat,
  NewsStory,
  QuoteSnapshot,
  SavedScreenerRecord,
  ScreenerFilterState,
  StatementTable,
  StockDossier,
  SymbolDirectoryEntry,
  WatchlistRecord,
} from "@/lib/shared"

import { createFmpClient, FmpRequestError } from "./client"
import {
  getMarketPlanSummary,
  getQuoteCacheTtlSeconds,
  isCapabilityEnabled,
  isFmpConfigured,
} from "./config"
import {
  countSymbolDirectoryEntries,
  createWatchlistForUser,
  ensureDefaultWatchlistForUser,
  getCachedMarketPayload,
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
const NEWS_TTL_SECONDS = 60 * 30
const PROFILE_TTL_SECONDS = 60 * 60 * 24
const CALENDAR_TTL_SECONDS = 60 * 30
const EOD_TTL_SECONDS = 60 * 60 * 24
const MACRO_TTL_SECONDS = 60 * 60 * 6

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

async function mayUseLiveFmp() {
  if (!isFmpConfigured()) {
    return false
  }

  const plan = getMarketPlanSummary()

  if (plan.tier !== "BASIC") {
    return true
  }

  const usage = await getMarketApiUsageForToday("fmp").catch(() => 0)
  return usage < BASIC_SOFT_DAILY_LIMIT
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
  const normalized = symbols.map(normalizeSymbol).filter(Boolean)

  if (normalized.length === 0) {
    return []
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
  const normalized = symbols.map(normalizeSymbol).filter(Boolean)

  if (normalized.length === 0 || !(await mayUseLiveFmp())) {
    return []
  }

  const quotes = await client.quotes.getBatchQuotes(normalized)
  await setCachedMarketPayload({
    cacheKey: `quotes:${normalized.join(",")}`,
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    payload: quotes,
  }).catch(() => undefined)

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
  ] = await Promise.all([
    getQuotesForSymbols(
      primaryWatchlist?.symbols ?? [...CORE_WATCHLIST_SYMBOLS]
    ),
    withMarketCache({
      cacheKey: "overview:indexes",
      category: "quotes",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: [] as QuoteSnapshot[],
      fetcher: () => client.quotes.getIndexQuotes(),
    }),
    withMarketCache({
      cacheKey: "overview:movers",
      category: "quotes",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: [],
      fetcher: () => client.quotes.getMovers(),
    }),
    withMarketCache({
      cacheKey: `overview:sectors:${todayIsoDate()}`,
      category: "sectors",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: [],
      fetcher: () => client.quotes.getSectorPerformance(todayIsoDate()),
    }),
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
    withMarketCache({
      cacheKey: `macro:${todayIsoDate()}`,
      category: "macro",
      ttlSeconds: MACRO_TTL_SECONDS,
      fallback: [],
      fetcher: async () => {
        const [treasury, indicators] = await Promise.all([
          client.macro.getTreasuryRates(),
          client.macro.getEconomicIndicators([
            "GDP",
            "CPI",
            "Unemployment Rate",
          ]),
        ])

        return [...treasury.slice(0, 3), ...indicators]
      },
    }),
    withMarketCache({
      cacheKey: `news:latest:${todayIsoDate()}`,
      category: "news",
      ttlSeconds: NEWS_TTL_SECONDS,
      fallback: [] as NewsStory[],
      fetcher: () => client.news.getLatestStockNews(12),
    }),
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
    calendar: [...earnings, ...dividends]
      .sort((left, right) => left.eventDate.localeCompare(right.eventDate))
      .slice(0, 10),
    macro,
    news: dedupeNews(news).slice(0, 10),
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
  const [earnings, dividends] = await Promise.all([
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
  ])

  return [...earnings, ...dividends].sort((left, right) =>
    left.eventDate.localeCompare(right.eventDate)
  )
}

export async function getMarketsSnapshot() {
  const [indexes, movers, sectors, macro] = await Promise.all([
    withMarketCache({
      cacheKey: "overview:indexes",
      category: "quotes",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: [] as QuoteSnapshot[],
      fetcher: () => client.quotes.getIndexQuotes(),
    }),
    withMarketCache({
      cacheKey: "overview:movers",
      category: "quotes",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: [],
      fetcher: () => client.quotes.getMovers(),
    }),
    withMarketCache({
      cacheKey: `overview:sectors:${todayIsoDate()}`,
      category: "sectors",
      ttlSeconds: getQuoteCacheTtlSeconds(),
      fallback: [],
      fetcher: () => client.quotes.getSectorPerformance(todayIsoDate()),
    }),
    withMarketCache({
      cacheKey: `macro:${todayIsoDate()}`,
      category: "macro",
      ttlSeconds: MACRO_TTL_SECONDS,
      fallback: [],
      fetcher: async () => {
        const [treasury, indicators] = await Promise.all([
          client.macro.getTreasuryRates(),
          client.macro.getEconomicIndicators([
            "GDP",
            "CPI",
            "Unemployment Rate",
          ]),
        ])

        return [...treasury.slice(0, 3), ...indicators]
      },
    }),
  ])

  return { plan: getMarketPlanSummary(), indexes, movers, sectors, macro }
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

  if (!plan.capabilities.etfHoldings) {
    locked.push(
      buildLockedSection(
        "ETF Context",
        "etfHoldings",
        "Upgrade for ETF holding and exposure look-through."
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

export async function getStockDossier(symbol: string): Promise<StockDossier> {
  const normalizedSymbol = normalizeSymbol(symbol)
  const plan = getMarketPlanSummary()
  const lockedSections = resolveLockedSections(plan)
  const latestNewsKey = `stock:${normalizedSymbol}:news:${todayIsoDate()}`
  const filingsFrom = plusDaysIsoDate(-180)
  const filingsTo = plusDaysIsoDate(0)
  const [
    profile,
    quote,
    chart,
    keyMetrics,
    ratioMetrics,
    ratings,
    incomeStatement,
    balanceSheet,
    cashFlow,
    growth,
    dividends,
    earnings,
    companyNews,
    secFilings,
    analyst,
    insiderTrades,
    ownership,
    etfExposure,
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
      cacheKey: `stock:${normalizedSymbol}:eod-chart`,
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
      cacheKey: latestNewsKey,
      category: "news",
      ttlSeconds: NEWS_TTL_SECONDS,
      fallback: [] as NewsStory[],
      fetcher: () => client.news.getStockNews(normalizedSymbol, 10),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:filings:${filingsFrom}:${filingsTo}`,
      category: "filings",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as StockDossier["filings"],
      allowLive: isCapabilityEnabled("secFilings"),
      fetcher: () =>
        client.filings.getSecFilings(normalizedSymbol, filingsFrom, filingsTo),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:analyst`,
      category: "analyst",
      ttlSeconds: NEWS_TTL_SECONDS,
      fallback: null,
      allowLive: isCapabilityEnabled("analystInsights"),
      fetcher: () => client.analyst.getSummary(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:insider`,
      category: "insider",
      ttlSeconds: NEWS_TTL_SECONDS,
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
      allowLive: isCapabilityEnabled("etfHoldings"),
      fetcher: () => client.etf.getAssetExposure(normalizedSymbol),
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
    symbol: normalizedSymbol,
    generatedAt: new Date().toISOString(),
    plan,
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
    statements: compactTables([incomeStatement, balanceSheet, cashFlow]),
    growth: growth.filter((item) => item.value !== null),
    calendar: [...earnings, ...dividends]
      .sort((left, right) => right.eventDate.localeCompare(left.eventDate))
      .slice(0, 10),
    news: dedupeNews(companyNews).slice(0, 12),
    analyst,
    filings: secFilings.slice(0, 10),
    insiderTrades: insiderTrades.slice(0, 8),
    ownership: ownership.slice(0, 8),
    etfExposure: etfExposure.slice(0, 8),
    lockedSections,
  }
}

export async function getWatchlistPageData(params: {
  userId: string
  watchlistId: string
}): Promise<{
  watchlist: WatchlistRecord | null
  quotes: QuoteSnapshot[]
  plan: MarketPlanSummary
}> {
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
    quotes: await getQuotesForSymbols(watchlist?.symbols ?? []),
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
    exchange: filters.exchange,
    limit: 25,
  }
}

export async function runMarketScreener(
  filters: ScreenerFilterState
): Promise<MarketSearchResult[]> {
  const cacheKey = `screener:${JSON.stringify(filters)}`

  return withMarketCache({
    cacheKey,
    category: "screener",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as MarketSearchResult[],
    fetcher: () => client.directory.screenCompanies(toScreenerParams(filters)),
  })
}

export async function saveMarketScreener(params: {
  userId: string
  name: string
  filters: ScreenerFilterState
}): Promise<SavedScreenerRecord> {
  return upsertSavedScreenerForUser(params)
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
