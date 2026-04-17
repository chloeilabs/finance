import "server-only"

import type {
  CalendarEvent,
  MetricStat,
  NewsStory,
  QuoteSnapshot,
  StatementTable,
} from "@/lib/shared/markets/core"
import type { LockedMarketSection } from "@/lib/shared/markets/intelligence"
import type {
  FmpCapabilityKey,
  FmpIntradayInterval,
} from "@/lib/shared/markets/plan"

import { mayUseLiveFmp, withMarketCache } from "./cache"
import { createFmpClient, FmpRequestError } from "./client"
import { getQuoteCacheTtlSeconds } from "./config"
import { isUndefinedTableError, MarketStoreNotInitializedError } from "./errors"
import { setCachedMarketPayload } from "./store"

export const CORE_WATCHLIST_SYMBOLS = [
  "NVDA",
  "AAPL",
  "GOOGL",
  "MSFT",
  "AMZN",
  "AVGO",
  "TSLA",
  "META",
  "BRK.B",
] as const

export const NEWS_TTL_SECONDS = 60 * 5
export const PROFILE_TTL_SECONDS = 60 * 60 * 24
export const CALENDAR_TTL_SECONDS = 60 * 60
export const EOD_TTL_SECONDS = 60 * 15
export const FILINGS_TTL_SECONDS = 60 * 60
export const ANALYST_TTL_SECONDS = 60 * 30
export const INSIDER_TTL_SECONDS = 60 * 3
export const MARKET_STRUCTURE_TTL_SECONDS = 60 * 30
export const TECHNICAL_TTL_SECONDS = 60 * 15
export const TREASURY_TTL_SECONDS = 60 * 60 * 2
export const ECONOMIC_INDICATORS_TTL_SECONDS = 60 * 60 * 4
export const MOVERS_TTL_SECONDS = 60 * 3
export const SECTOR_TTL_SECONDS = 60 * 60
export const RISK_PREMIUM_TTL_SECONDS = 60 * 60 * 12
export const QUOTE_FETCH_CONCURRENCY = 4
export const EOD_CHART_CACHE_VERSION = "v3"
export const INTRADAY_CHART_CACHE_VERSION = "v1"
export const CORE_ECONOMIC_INDICATORS = [
  "GDP",
  "CPI",
  "Unemployment Rate",
] as const
export const CORE_MARKET_EXCHANGES = ["NASDAQ", "NYSE", "AMEX"] as const
export const CORE_CRYPTO_SYMBOLS = [
  "BTCUSD",
  "ETHUSD",
  "SOLUSD",
  "XRPUSD",
] as const
export const CORE_FOREX_SYMBOLS = [
  "EURUSD",
  "GBPUSD",
  "USDJPY",
  "AUDUSD",
] as const
export const CORE_COMMODITY_SYMBOLS = ["GCUSD", "SIUSD"] as const
export const COMPARE_SYMBOL_LIMIT = 5

export interface PeerProfileSnapshot {
  companyName: string
  marketCap: number | null
}

export const client = createFmpClient()

export function normalizeSymbol(symbol: string): string {
  return symbol.trim().toUpperCase()
}

export function normalizeSymbols(symbols: string[]): string[] {
  return [...new Set(symbols.map(normalizeSymbol).filter(Boolean))]
}

export async function mapWithConcurrency<T, R>(
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

export function buildLockedSection(
  title: string,
  capability: FmpCapabilityKey,
  description: string
): LockedMarketSection {
  return { title, capability, description }
}

export function compactMetricStats(groups: MetricStat[][]): MetricStat[] {
  return groups.flat().filter((item) => item.value !== null)
}

export function compactTables(
  tables: (StatementTable | null)[]
): StatementTable[] {
  return tables.filter((table): table is StatementTable => table !== null)
}

export function rethrowMarketStoreUnavailable(error: unknown): never {
  if (isUndefinedTableError(error)) {
    throw new MarketStoreNotInitializedError()
  }

  throw error
}

export function dedupeNews(stories: NewsStory[]): NewsStory[] {
  const seen = new Set<string>()

  return stories.filter((story) => {
    if (seen.has(story.id)) {
      return false
    }

    seen.add(story.id)
    return true
  })
}

export function dedupeCalendarEvents(events: CalendarEvent[]): CalendarEvent[] {
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

export function getQuoteCacheKey(symbol: string): string {
  return `quote:${normalizeSymbol(symbol)}`
}

export function getEodChartCacheKey(
  symbol: string,
  variant: "full" | "compact" = "full"
): string {
  return [
    "stock",
    normalizeSymbol(symbol),
    "eod-chart",
    variant,
    EOD_CHART_CACHE_VERSION,
  ].join(":")
}

export function getIntradayChartCacheKey(
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

export async function setCachedQuoteSnapshot(
  quote: QuoteSnapshot
): Promise<void> {
  await setCachedMarketPayload({
    cacheKey: getQuoteCacheKey(quote.symbol),
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    payload: quote,
  }).catch(() => undefined)
}

export async function getCachedQuoteSnapshot(
  symbol: string
): Promise<QuoteSnapshot | null> {
  const normalizedSymbol = normalizeSymbol(symbol)

  if (!normalizedSymbol) {
    return null
  }

  return withMarketCache({
    cacheKey: getQuoteCacheKey(normalizedSymbol),
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    fallback: null,
    staleOnError: true,
    fetcher: () => client.quotes.getQuote(normalizedSymbol),
  })
}

export async function primeCachedQuoteSnapshot(
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

export function getMetricNumberByLabel(
  metrics: MetricStat[],
  label: string
): number | null {
  const metric = metrics.find((item) => item.label === label)
  return typeof metric?.value === "number" ? metric.value : null
}
