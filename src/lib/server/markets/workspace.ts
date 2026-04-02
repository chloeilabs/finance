import "server-only"

import type { MarketSearchResult, MetricStat } from "@/lib/shared/markets/core"
import type { MarketPlanSummary } from "@/lib/shared/markets/plan"
import type {
  MarketScreenerSortKey,
  SavedScreenerRecord,
  ScreenerFilterState,
  ScreenerOptions,
  WatchlistRecord,
} from "@/lib/shared/markets/workspace"

import { mayUseLiveFmp, withMarketCache } from "./cache"
import { createFmpClient } from "./client"
import {
  getFmpPlanValidationSummary,
  getMarketPlanSummary,
  isFmpConfigured,
} from "./config"
import {
  createMarketStoreNotInitializedError,
  isUndefinedTableError,
} from "./errors"
import {
  getStockDividendSnapshot,
  getStockFinancialScores,
  getStockShareFloat,
  getStockValuationSnapshot,
} from "./service-dossier-fetchers"
import {
  CORE_WATCHLIST_SYMBOLS,
  getMetricNumberByLabel,
  mapWithConcurrency,
  PROFILE_TTL_SECONDS,
  QUOTE_FETCH_CONCURRENCY,
} from "./service-support"
import {
  createWatchlistForUser,
  deleteSavedScreenerForUser,
  ensureDefaultWatchlistForUser,
  listSavedScreenersForUser,
  listWatchlistsForUser,
  replaceWatchlistSymbols,
  searchSymbolDirectory,
  upsertSavedScreenerForUser,
  upsertSymbolDirectoryEntries,
} from "./store"

const client = createFmpClient()
const DIVIDEND_YIELD_SCREENER_LIMIT = 100
const OUTDATED_CORE_WATCHLIST_SYMBOL_ORDERS = [
  CORE_WATCHLIST_SYMBOLS.filter((symbol) => symbol !== "AVGO"),
  ["AAPL", "MSFT", "NVDA", "AVGO", "AMZN", "META", "TSLA", "GOOGL", "BRK.B"],
] as const

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

function isOutdatedDefaultCoreWatchlist(watchlist: WatchlistRecord): boolean {
  return (
    watchlist.id === "core" &&
    OUTDATED_CORE_WATCHLIST_SYMBOL_ORDERS.some(
      (symbols) =>
        watchlist.symbols.length === symbols.length &&
        watchlist.symbols.every((symbol, index) => symbol === symbols[index])
    )
  )
}

function rethrowMarketStoreUnavailable(error: unknown): never {
  if (isUndefinedTableError(error)) {
    throw createMarketStoreNotInitializedError()
  }

  throw error
}

function toSearchResult(entry: {
  symbol: string
  name: string
  exchange: string | null
  exchangeShortName: string | null
  type: string | null
  currency: string | null
  sector: string | null
  industry: string | null
}): MarketSearchResult {
  return {
    symbol: entry.symbol,
    name: entry.name,
    exchange: entry.exchange,
    exchangeShortName: entry.exchangeShortName,
    type: entry.type,
    currency: entry.currency,
    sector: entry.sector,
    industry: entry.industry,
  }
}

async function hydrateSearchResultsIntoDirectory(
  results: MarketSearchResult[]
) {
  if (results.length === 0) {
    return
  }

  const entries = results.map((result) => ({
    symbol: result.symbol,
    name: result.name,
    exchange: result.exchange,
    exchangeShortName: result.exchangeShortName,
    type: result.type,
    currency: result.currency,
    sector: result.sector,
    industry: result.industry,
    country: null,
    isActivelyTrading: true,
    isEtf: /etf/i.test(result.type ?? ""),
    updatedAt: new Date().toISOString(),
  }))

  await upsertSymbolDirectoryEntries(entries).catch(() => undefined)
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
    limit: shouldUseLocalDividendYieldPass(filters)
      ? DIVIDEND_YIELD_SCREENER_LIMIT
      : 25,
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
    case "dividendYield":
      return result.dividendYieldTtm ?? Number.NEGATIVE_INFINITY
    case "dcf":
      return result.dcf ?? Number.NEGATIVE_INFINITY
    case "piotroskiScore":
      return result.piotroskiScore ?? Number.NEGATIVE_INFINITY
    case "freeFloatPercentage":
      return result.freeFloatPercentage ?? Number.NEGATIVE_INFINITY
  }
}

function sortScreenerResults(
  results: MarketSearchResult[],
  filters: ScreenerFilterState
) {
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

function normalizeDividendYieldThreshold(value: number | undefined) {
  if (value === undefined) {
    return undefined
  }

  if (Math.abs(value) > 1) {
    return value / 100
  }

  return value
}

function shouldUseLocalDividendYieldPass(filters: ScreenerFilterState) {
  return (
    filters.dividendYieldMin !== undefined ||
    filters.dividendYieldMax !== undefined ||
    filters.sortBy === "dividendYield"
  )
}

async function enrichScreenerResultsWithDividendData(
  results: MarketSearchResult[]
): Promise<MarketSearchResult[]> {
  return mapWithConcurrency(
    results,
    QUOTE_FETCH_CONCURRENCY,
    async (result) => {
      const dividendSnapshot = await getStockDividendSnapshot(
        normalizeSymbol(result.symbol)
      )

      return {
        ...result,
        dividendYieldTtm: dividendSnapshot?.dividendYieldTtm ?? null,
        dividendPerShareTtm: dividendSnapshot?.dividendPerShareTtm ?? null,
        dividendPayoutRatioTtm:
          dividendSnapshot?.dividendPayoutRatioTtm ?? null,
      } satisfies MarketSearchResult
    }
  )
}

function applyDividendYieldFilters(
  results: MarketSearchResult[],
  filters: ScreenerFilterState
) {
  const minThreshold = normalizeDividendYieldThreshold(filters.dividendYieldMin)
  const maxThreshold = normalizeDividendYieldThreshold(filters.dividendYieldMax)

  return results.filter((result) => {
    const dividendYieldTtm = result.dividendYieldTtm

    if (
      minThreshold !== undefined &&
      (dividendYieldTtm === null ||
        dividendYieldTtm === undefined ||
        dividendYieldTtm < minThreshold)
    ) {
      return false
    }

    if (
      maxThreshold !== undefined &&
      (dividendYieldTtm === null ||
        dividendYieldTtm === undefined ||
        dividendYieldTtm > maxThreshold)
    ) {
      return false
    }

    return true
  })
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

  const validation = getFmpPlanValidationSummary()

  if (!validation) {
    warnings.push(
      "FMP capability validation is missing. Run `pnpm markets:capabilities:write` to refresh the live plan snapshot."
    )
  } else {
    const ageMs = Date.now() - new Date(validation.validatedAt).getTime()
    const thirtyDaysMs = 1000 * 60 * 60 * 24 * 30

    if (Number.isFinite(ageMs) && ageMs > thirtyDaysMs) {
      warnings.push(
        `FMP capability validation is older than 30 days. Run \`pnpm markets:capabilities:write\` to refresh the ${validation.tier.toLowerCase()} snapshot.`
      )
    }
  }

  try {
    const watchlists = await listWatchlistsForUser(userId)

    if (watchlists.length > 0) {
      const outdatedCoreWatchlist = watchlists.find(
        isOutdatedDefaultCoreWatchlist
      )

      if (outdatedCoreWatchlist) {
        await replaceWatchlistSymbols({
          userId,
          watchlistId: outdatedCoreWatchlist.id,
          symbols: [...CORE_WATCHLIST_SYMBOLS],
        })

        return {
          plan,
          watchlists: await listWatchlistsForUser(userId),
          warnings,
        }
      }

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

  const localResults = await searchSymbolDirectory({
    query: normalizedQuery,
    limit: 10,
  }).catch(() => [])

  if (localResults.length > 0) {
    return localResults.map(toSearchResult)
  }

  if (!(await mayUseLiveFmp())) {
    return []
  }

  const liveResults = await withMarketCache({
    cacheKey: `search:${normalizedQuery.toLowerCase()}`,
    category: "directory-search",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as MarketSearchResult[],
    staleOnError: true,
    fetcher: () => client.directory.searchSymbols(normalizedQuery),
  })

  void hydrateSearchResultsIntoDirectory(liveResults).catch(() => undefined)
  return liveResults
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
    staleOnError: true,
    fetcher: () => client.directory.screenCompanies(toScreenerParams(filters)),
  })

  const resultsWithDividendData =
    await enrichScreenerResultsWithDividendData(results)

  return sortScreenerResults(
    applyDividendYieldFilters(resultsWithDividendData, filters),
    filters
  ).slice(0, 25)
}

export async function getEnrichedMarketScreenerResults(
  filters: ScreenerFilterState
): Promise<MarketSearchResult[]> {
  const results = await runMarketScreener(filters)

  return mapWithConcurrency(
    results,
    QUOTE_FETCH_CONCURRENCY,
    async (result) => {
      const symbol = normalizeSymbol(result.symbol)

      const [scores, keyMetrics, valuation, shareFloat] = await Promise.all([
        getStockFinancialScores(symbol),
        withMarketCache({
          cacheKey: `stock:${symbol}:key-metrics`,
          category: "fundamentals",
          ttlSeconds: PROFILE_TTL_SECONDS,
          fallback: [] as MetricStat[],
          staleOnError: true,
          fetcher: () => client.fundamentals.getKeyMetricsTtm(symbol),
        }),
        getStockValuationSnapshot(symbol),
        getStockShareFloat(symbol),
      ])

      return {
        ...result,
        dcf: valuation?.dcf ?? null,
        altmanZScore: scores?.altmanZScore ?? null,
        piotroskiScore: scores?.piotroskiScore ?? null,
        fcfYield: getMetricNumberByLabel(keyMetrics, "FCF Yield"),
        freeFloatPercentage: shareFloat?.freeFloatPercentage ?? null,
        floatShares: shareFloat?.floatShares ?? null,
      } satisfies MarketSearchResult
    }
  )
}

export async function saveMarketScreener(params: {
  userId: string
  name: string
  filters: ScreenerFilterState
}): Promise<SavedScreenerRecord> {
  return upsertSavedScreenerForUser(params).catch((error: unknown) =>
    rethrowMarketStoreUnavailable(error)
  )
}

export async function deleteSavedMarketScreener(params: {
  userId: string
  screenerId: string
}): Promise<void> {
  return deleteSavedScreenerForUser(params.userId, params.screenerId).catch(
    (error: unknown) => rethrowMarketStoreUnavailable(error)
  )
}

export async function getMarketScreenerOptions(): Promise<ScreenerOptions> {
  const [exchanges, sectors, industries] = await Promise.all([
    withMarketCache({
      cacheKey: "directory:exchanges",
      category: "directory",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as string[],
      staleOnError: true,
      fetcher: () => client.directory.listExchanges(),
    }),
    withMarketCache({
      cacheKey: "directory:sectors",
      category: "directory",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as string[],
      staleOnError: true,
      fetcher: () => client.directory.listSectors(),
    }),
    withMarketCache({
      cacheKey: "directory:industries",
      category: "directory",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as string[],
      staleOnError: true,
      fetcher: () => client.directory.listIndustries(),
    }),
  ])

  return {
    exchanges,
    sectors,
    industries,
  }
}

export async function getSavedMarketScreeners(
  userId: string
): Promise<SavedScreenerRecord[]> {
  return listSavedScreenersForUser(userId).catch((error: unknown) =>
    rethrowMarketStoreUnavailable(error)
  )
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
  }).catch((error: unknown) => rethrowMarketStoreUnavailable(error))
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
  }).catch((error: unknown) => rethrowMarketStoreUnavailable(error))
}
