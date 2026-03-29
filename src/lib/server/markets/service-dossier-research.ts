import "server-only"

import type {
  CalendarEvent,
  MetricStat,
  QuoteSnapshot,
  TechnicalIndicatorSeries,
} from "@/lib/shared/markets/core"
import type {
  AnalystSummary,
  ResearchQuoteRow,
  StockDossier,
} from "@/lib/shared/markets/intelligence"
import type {
  ComparePageData,
  WatchlistResearchData,
} from "@/lib/shared/markets/workspace"

import { withMarketCache } from "./cache"
import { getMarketPlanSummary, isCapabilityEnabled } from "./config"
import { createMarketDateClock } from "./market-clock"
import {
  getPeerComparisonRows,
  getStockFinancialScores,
  getStockShareFloat,
  getStockTechnicals,
  getStockValuationSnapshot,
} from "./service-dossier-fetchers"
import {
  ANALYST_TTL_SECONDS,
  CALENDAR_TTL_SECONDS,
  client,
  COMPARE_SYMBOL_LIMIT,
  getCachedQuoteSnapshot,
  getMetricNumberByLabel,
  mapWithConcurrency,
  normalizeSymbols,
  PROFILE_TTL_SECONDS,
  QUOTE_FETCH_CONCURRENCY,
  rethrowMarketStoreUnavailable,
} from "./service-support"
import { getWatchlistForUser } from "./store"

async function buildResearchRows(
  symbols: string[]
): Promise<ResearchQuoteRow[]> {
  const clock = createMarketDateClock()
  const normalized = normalizeSymbols(symbols)

  return mapWithConcurrency<string, ResearchQuoteRow>(
    normalized,
    QUOTE_FETCH_CONCURRENCY,
    async (symbol) => {
      const [
        quote,
        technicals,
        earnings,
        analyst,
        scores,
        keyMetrics,
        valuation,
        shareFloat,
      ]: [
        QuoteSnapshot | null,
        TechnicalIndicatorSeries[],
        CalendarEvent[],
        AnalystSummary | null,
        StockDossier["financialScores"],
        MetricStat[],
        StockDossier["valuation"],
        StockDossier["shareFloat"],
      ] = await Promise.all([
        getCachedQuoteSnapshot(symbol),
        getStockTechnicals(symbol),
        withMarketCache({
          cacheKey: `stock:${symbol}:earnings`,
          category: "calendar",
          ttlSeconds: CALENDAR_TTL_SECONDS,
          fallback: [] as CalendarEvent[],
          staleOnError: true,
          fetcher: () => client.calendar.getEarnings(symbol),
        }),
        withMarketCache({
          cacheKey: `stock:${symbol}:analyst`,
          category: "analyst",
          ttlSeconds: ANALYST_TTL_SECONDS,
          fallback: null,
          allowLive: isCapabilityEnabled("analystInsights"),
          staleOnError: true,
          fetcher: () => client.analyst.getSummary(symbol),
        }),
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

      const rsiSeries = technicals.find(
        (item: TechnicalIndicatorSeries) => item.id === "rsi14"
      )
      const nextEarnings = earnings
        .filter((item: CalendarEvent) => item.eventDate >= clock.today)
        .sort((left: CalendarEvent, right: CalendarEvent) =>
          left.eventDate.localeCompare(right.eventDate)
        )[0]

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
        fcfYield: getMetricNumberByLabel(keyMetrics, "FCF Yield"),
        roic: getMetricNumberByLabel(keyMetrics, "ROIC"),
        dcf: valuation?.dcf ?? null,
        freeFloatPercentage: shareFloat?.freeFloatPercentage ?? null,
        floatShares: shareFloat?.floatShares ?? null,
      } satisfies ResearchQuoteRow
    }
  )
}

export async function getWatchlistPageData(params: {
  userId: string
  watchlistId: string
}): Promise<WatchlistResearchData> {
  const watchlist = await getWatchlistForUser(
    params.userId,
    params.watchlistId
  ).catch((error: unknown) => rethrowMarketStoreUnavailable(error))

  return {
    status: "ok",
    watchlist,
    rows: await buildResearchRows(watchlist?.symbols ?? []),
    plan: getMarketPlanSummary(),
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
