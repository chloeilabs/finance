import "server-only"

import type {
  AftermarketSnapshot,
  DividendSnapshot,
  MetricStat,
  QuoteSnapshot,
  TechnicalIndicatorSeries,
} from "@/lib/shared/markets/core"
import type {
  AnalystEstimateSnapshot,
  AnalystSummary,
  EmployeeCountPoint,
  ExecutiveEntry,
  GradesConsensus,
  MarketCapPoint,
  PeerComparisonRow,
  RatingsHistoricalEntry,
  RevenueSegmentation,
  SecProfile,
  ShareFloatSnapshot,
  StockDossier,
} from "@/lib/shared/markets/intelligence"
import type { FmpIntradayInterval } from "@/lib/shared/markets/plan"

import { withMarketCache } from "./cache"
import { getQuoteCacheTtlSeconds, isCapabilityEnabled } from "./config"
import {
  ANALYST_TTL_SECONDS,
  client,
  COMPARE_SYMBOL_LIMIT,
  EOD_TTL_SECONDS,
  getCachedQuoteSnapshot,
  getIntradayChartCacheKey,
  getMetricNumberByLabel,
  mapWithConcurrency,
  normalizeSymbols,
  type PeerProfileSnapshot,
  PROFILE_TTL_SECONDS,
  QUOTE_FETCH_CONCURRENCY,
  TECHNICAL_TTL_SECONDS,
} from "./service-support"

export async function getIntradayCharts(
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
        staleOnError: true,
        fetcher: () => client.charts.getIntradayChart(symbol, interval),
      })

      return [interval, points] as const
    })
  )

  return Object.fromEntries(
    results.filter(([, points]) => points.length > 0)
  ) as Partial<Record<FmpIntradayInterval, StockDossier["chart"]>>
}

export async function getStockPriceHistoryIntradayChart(
  symbol: string
): Promise<StockDossier["chart"]> {
  return withMarketCache({
    cacheKey: getIntradayChartCacheKey(symbol, "5min"),
    category: "chart",
    ttlSeconds: EOD_TTL_SECONDS,
    fallback: [] as StockDossier["chart"],
    allowLive: isCapabilityEnabled("intradayCharts"),
    staleOnError: true,
    fetcher: () => client.charts.getIntradayChart(symbol, "5min"),
  })
}

export async function getStockAftermarketSnapshot(
  symbol: string
): Promise<AftermarketSnapshot | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:aftermarket`,
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    fallback: null,
    staleOnError: true,
    fetcher: () => client.quotes.getAftermarketSnapshot(symbol),
  })
}

export async function getStockPriceChangeSnapshot(
  symbol: string
): Promise<StockDossier["priceChange"]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:price-change`,
    category: "quotes",
    ttlSeconds: getQuoteCacheTtlSeconds(),
    fallback: null,
    staleOnError: true,
    fetcher: () => client.quotes.getPriceChange(symbol),
  })
}

export async function getStockTechnicals(
  symbol: string
): Promise<TechnicalIndicatorSeries[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:technicals`,
    category: "technicals",
    ttlSeconds: TECHNICAL_TTL_SECONDS,
    fallback: [] as TechnicalIndicatorSeries[],
    allowLive: isCapabilityEnabled("technicalIndicators"),
    staleOnError: true,
    fetcher: () => client.technicals.getCoreIndicators(symbol),
  })
}

export async function getStockFinancialScores(
  symbol: string
): Promise<StockDossier["financialScores"]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:financial-scores`,
    category: "fundamentals",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    staleOnError: true,
    fetcher: () => client.fundamentals.getFinancialScores(symbol),
  })
}

function parseEventValue(value: string | null | undefined): number | null {
  if (!value) {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export async function getStockDividendSnapshot(
  symbol: string
): Promise<DividendSnapshot | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:dividend-snapshot`,
    category: "fundamentals",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    staleOnError: true,
    fetcher: async () => {
      const [ratios, dividends] = await Promise.all([
        client.fundamentals.getRatiosTtm(symbol),
        client.calendar.getDividends(symbol),
      ])

      const latestDividend = dividends[0] ?? null
      const snapshot: DividendSnapshot = {
        dividendYieldTtm: getMetricNumberByLabel(ratios, "Dividend Yield"),
        dividendPerShareTtm: getMetricNumberByLabel(ratios, "Dividend / Share"),
        dividendPayoutRatioTtm: getMetricNumberByLabel(ratios, "Payout Ratio"),
        latestDividendPerShare: parseEventValue(latestDividend?.value),
        latestDividendYield: latestDividend?.yield ?? null,
        latestDividendDate: latestDividend?.eventDate ?? null,
        latestRecordDate: latestDividend?.recordDate ?? null,
        latestPaymentDate: latestDividend?.paymentDate ?? null,
        latestDeclarationDate: latestDividend?.declarationDate ?? null,
        frequency: latestDividend?.frequency ?? null,
      }

      return Object.values(snapshot).some((value) => value !== null)
        ? snapshot
        : null
    },
  })
}

export async function getStockValuationSnapshot(
  symbol: string
): Promise<StockDossier["valuation"]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:valuation`,
    category: "valuation",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    allowLive: isCapabilityEnabled("dcf"),
    staleOnError: true,
    fetcher: () => client.valuation.getSnapshot(symbol),
  })
}

export async function getStockGradesConsensus(
  symbol: string
): Promise<GradesConsensus | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:grades-consensus`,
    category: "analyst",
    ttlSeconds: ANALYST_TTL_SECONDS,
    fallback: null,
    allowLive: isCapabilityEnabled("analystInsights"),
    staleOnError: true,
    fetcher: () => client.analyst.getGradesConsensus(symbol),
  })
}

export async function getStockAnalystEstimates(
  symbol: string
): Promise<AnalystEstimateSnapshot[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:analyst-estimates`,
    category: "analyst",
    ttlSeconds: ANALYST_TTL_SECONDS,
    fallback: [] as AnalystEstimateSnapshot[],
    allowLive: isCapabilityEnabled("analystInsights"),
    staleOnError: true,
    fetcher: () => client.analyst.getAnalystEstimates(symbol),
  })
}

export async function getStockRatingsHistory(
  symbol: string
): Promise<RatingsHistoricalEntry[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:ratings-history`,
    category: "analyst",
    ttlSeconds: ANALYST_TTL_SECONDS,
    fallback: [] as RatingsHistoricalEntry[],
    staleOnError: true,
    fetcher: () => client.analyst.getRatingsHistorical(symbol),
  })
}

export async function getStockProductSegments(
  symbol: string
): Promise<RevenueSegmentation | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:product-segments`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    staleOnError: true,
    fetcher: () => client.company.getProductSegmentation(symbol),
  })
}

export async function getStockGeographicSegments(
  symbol: string
): Promise<RevenueSegmentation | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:geographic-segments`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    staleOnError: true,
    fetcher: () => client.company.getGeographicSegmentation(symbol),
  })
}

export async function getStockMarketCapHistory(
  symbol: string
): Promise<MarketCapPoint[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:market-cap-history`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as MarketCapPoint[],
    staleOnError: true,
    fetcher: async () =>
      (await client.company.getMarketCapHistory(symbol)).slice(-20),
  })
}

export async function getStockEmployeeHistory(
  symbol: string
): Promise<EmployeeCountPoint[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:employee-history`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as EmployeeCountPoint[],
    staleOnError: true,
    fetcher: async () => {
      const history = await client.company.getEmployeeHistory(symbol)
      const latest = await client.company
        .getLatestEmployeeCount(symbol)
        .catch(() => null)

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

export async function getStockSecProfile(
  symbol: string
): Promise<SecProfile | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:sec-profile`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    allowLive: isCapabilityEnabled("secFilings"),
    staleOnError: true,
    fetcher: () => client.company.getSecProfile(symbol),
  })
}

export async function getStockExecutives(
  symbol: string
): Promise<ExecutiveEntry[]> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:executives`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as ExecutiveEntry[],
    allowLive: isCapabilityEnabled("companyExecutives"),
    staleOnError: true,
    fetcher: () => client.company.getKeyExecutives(symbol),
  })
}

export async function getStockShareFloat(
  symbol: string
): Promise<ShareFloatSnapshot | null> {
  return withMarketCache({
    cacheKey: `stock:${symbol}:share-float`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: null,
    allowLive: isCapabilityEnabled("shareFloatLiquidity"),
    staleOnError: true,
    fetcher: () => client.company.getShareFloat(symbol),
  })
}

export async function getPeerComparisonRows(
  symbols: string[]
): Promise<PeerComparisonRow[]> {
  const normalized = normalizeSymbols(symbols).slice(0, COMPARE_SYMBOL_LIMIT)

  const rows = await mapWithConcurrency(
    normalized,
    QUOTE_FETCH_CONCURRENCY,
    async (symbol) => {
      const [
        profile,
        quote,
        ratios,
        keyMetrics,
        scores,
        analyst,
        dividendSnapshot,
        valuation,
        shareFloat,
      ]: [
        PeerProfileSnapshot | null,
        QuoteSnapshot | null,
        MetricStat[],
        MetricStat[],
        StockDossier["financialScores"],
        AnalystSummary | null,
        DividendSnapshot | null,
        StockDossier["valuation"],
        ShareFloatSnapshot | null,
      ] = await Promise.all([
        withMarketCache({
          cacheKey: `stock:${symbol}:profile`,
          category: "profile",
          ttlSeconds: PROFILE_TTL_SECONDS,
          fallback: null,
          staleOnError: true,
          fetcher: () => client.company.getProfile(symbol),
        }),
        getCachedQuoteSnapshot(symbol),
        withMarketCache({
          cacheKey: `stock:${symbol}:ratios`,
          category: "fundamentals",
          ttlSeconds: PROFILE_TTL_SECONDS,
          fallback: [] as MetricStat[],
          staleOnError: true,
          fetcher: () => client.fundamentals.getRatiosTtm(symbol),
        }),
        withMarketCache({
          cacheKey: `stock:${symbol}:key-metrics`,
          category: "fundamentals",
          ttlSeconds: PROFILE_TTL_SECONDS,
          fallback: [] as MetricStat[],
          staleOnError: true,
          fetcher: () => client.fundamentals.getKeyMetricsTtm(symbol),
        }),
        getStockFinancialScores(symbol),
        withMarketCache({
          cacheKey: `stock:${symbol}:analyst`,
          category: "analyst",
          ttlSeconds: ANALYST_TTL_SECONDS,
          fallback: null,
          allowLive: isCapabilityEnabled("analystInsights"),
          staleOnError: true,
          fetcher: () => client.analyst.getSummary(symbol),
        }),
        getStockDividendSnapshot(symbol),
        getStockValuationSnapshot(symbol),
        getStockShareFloat(symbol),
      ])

      return {
        symbol,
        companyName: profile?.companyName ?? quote?.name ?? null,
        price: quote?.price ?? null,
        changesPercentage: quote?.changesPercentage ?? null,
        marketCap: profile?.marketCap ?? quote?.marketCap ?? null,
        peRatio: getMetricNumberByLabel(ratios, "P / E"),
        fcfYield: getMetricNumberByLabel(keyMetrics, "FCF Yield"),
        dividendYieldTtm: dividendSnapshot?.dividendYieldTtm ?? null,
        dividendPerShareTtm: dividendSnapshot?.dividendPerShareTtm ?? null,
        dividendPayoutRatioTtm:
          dividendSnapshot?.dividendPayoutRatioTtm ?? null,
        roic: getMetricNumberByLabel(keyMetrics, "ROIC"),
        altmanZScore: scores?.altmanZScore ?? null,
        piotroskiScore: scores?.piotroskiScore ?? null,
        dcf: valuation?.dcf ?? null,
        freeFloatPercentage: shareFloat?.freeFloatPercentage ?? null,
        floatShares: shareFloat?.floatShares ?? null,
        analystConsensus: analyst?.ratingSummary ?? null,
      } satisfies PeerComparisonRow
    }
  )

  return rows
}

export async function getStockPeerComparison(
  symbol: string
): Promise<PeerComparisonRow[]> {
  const peers = await withMarketCache({
    cacheKey: `stock:${symbol}:peers`,
    category: "profile",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as string[],
    staleOnError: true,
    fetcher: () => client.company.getPeers(symbol),
  })

  return getPeerComparisonRows([
    symbol,
    ...peers.slice(0, COMPARE_SYMBOL_LIMIT - 1),
  ])
}
