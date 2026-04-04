import "server-only"

import type {
  CalendarEvent,
  MetricStat,
  TechnicalIndicatorSeries,
} from "@/lib/shared/markets/core"
import type {
  EtfInfoSnapshot,
  ResearchQuoteRow,
} from "@/lib/shared/markets/intelligence"
import type { WatchlistResearchData } from "@/lib/shared/markets/workspace"

import { withMarketCache } from "./cache"
import { getMarketPlanSummary, isCapabilityEnabled } from "./config"
import { createMarketDateClock } from "./market-clock"
import {
  getResearchDividendYieldFraction,
  getStockCompanyProfile,
  getStockDividendSnapshot,
  getStockFinancialScores,
  getStockShareFloat,
  getStockTechnicals,
  getStockValuationSnapshot,
} from "./service-dossier-fetchers"
import {
  ANALYST_TTL_SECONDS,
  CALENDAR_TTL_SECONDS,
  client,
  getCachedQuoteSnapshot,
  getMetricNumberByLabel,
  mapWithConcurrency,
  normalizeSymbols,
  PROFILE_TTL_SECONDS,
  QUOTE_FETCH_CONCURRENCY,
  rethrowMarketStoreUnavailable,
} from "./service-support"
import { getSymbolDirectoryEntry, getWatchlistForUser } from "./store"

export async function buildResearchRows(
  symbols: string[]
): Promise<ResearchQuoteRow[]> {
  const clock = createMarketDateClock()
  const normalized = normalizeSymbols(symbols)

  return mapWithConcurrency<string, ResearchQuoteRow>(
    normalized,
    QUOTE_FETCH_CONCURRENCY,
    async (symbol) => {
      const [
        directoryEntry,
        quote,
        profile,
        technicals,
        earnings,
        analyst,
        scores,
        keyMetrics,
        dividendSnapshot,
        valuation,
        shareFloat,
      ] = await Promise.all([
        getSymbolDirectoryEntry(symbol).catch(() => null),
        getCachedQuoteSnapshot(symbol),
        getStockCompanyProfile(symbol),
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
        getStockDividendSnapshot(symbol),
        getStockValuationSnapshot(symbol),
        getStockShareFloat(symbol),
      ])
      const etfInfo =
        directoryEntry?.isEtf || profile === null
          ? await withMarketCache({
              cacheKey: `etf:${symbol}:info`,
              category: "profile",
              ttlSeconds: PROFILE_TTL_SECONDS,
              fallback: null as EtfInfoSnapshot | null,
              staleOnError: true,
              fetcher: () => client.etf.getInfo(symbol),
            })
          : null

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
        instrumentKind: directoryEntry?.isEtf || etfInfo ? "etf" : "stock",
        name: quote?.name ?? profile?.companyName ?? etfInfo?.name ?? null,
        currency: quote?.currency ?? etfInfo?.currency ?? null,
        change: quote?.change ?? null,
        price: quote?.price ?? null,
        changesPercentage: quote?.changesPercentage ?? null,
        marketCap: quote?.marketCap ?? null,
        sector: directoryEntry?.sector ?? profile?.sector ?? null,
        rsi14: rsiSeries?.points[rsiSeries.points.length - 1]?.value ?? null,
        nextEarningsDate: nextEarnings?.eventDate ?? null,
        analystConsensus: analyst?.ratingSummary ?? null,
        piotroskiScore: scores?.piotroskiScore ?? null,
        altmanZScore: scores?.altmanZScore ?? null,
        fcfYield: getMetricNumberByLabel(keyMetrics, "FCF Yield"),
        dividendYieldTtm:
          getResearchDividendYieldFraction(dividendSnapshot) ??
          etfInfo?.dividendYield ??
          null,
        dividendPerShareTtm:
          dividendSnapshot?.dividendPerShareTtm ?? etfInfo?.dividendPerShare ?? null,
        dividendPayoutRatioTtm:
          dividendSnapshot?.dividendPayoutRatioTtm ?? null,
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
