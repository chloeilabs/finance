import "server-only"

import type { MarketSearchResult } from "@/lib/shared/markets/core"
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
import { getMarketPlanSummary, isFmpConfigured } from "./config"
import {
  createMarketStoreNotInitializedError,
  isUndefinedTableError,
} from "./errors"
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
const PROFILE_TTL_SECONDS = 60 * 60 * 24
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

function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
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

async function hydrateSearchResultsIntoDirectory(results: MarketSearchResult[]) {
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

  return sortScreenerResults(results, filters)
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
