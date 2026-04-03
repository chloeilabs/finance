import "server-only"

import type {
  DividendSnapshot,
  InstrumentKind,
  MarketSearchResult,
  PricePoint,
} from "@/lib/shared/markets/core"
import type {
  EtfDossier,
  EtfInfoSnapshot,
  HistoricalPriceRow,
} from "@/lib/shared/markets/intelligence"

import { mayUseLiveFmp, withMarketCache } from "./cache"
import { getMarketPlanSummary } from "./config"
import {
  getIntradayCharts,
  getStockAftermarketSnapshot,
  getStockDividendSnapshot,
  getStockPriceChangeSnapshot,
} from "./service-dossier-fetchers"
import {
  client,
  dedupeNews,
  EOD_TTL_SECONDS,
  getEodChartCacheKey,
  NEWS_TTL_SECONDS,
  normalizeSymbol,
  PROFILE_TTL_SECONDS,
} from "./service-support"
import { getSymbolDirectoryEntry, upsertSymbolDirectoryEntries } from "./store"

function getInstrumentKindFromSearchResult(
  result: Pick<MarketSearchResult, "instrumentKind" | "type">
) {
  if (result.instrumentKind) {
    return result.instrumentKind
  }

  return /etf|fund/i.test(result.type ?? "") ? "etf" : "stock"
}

function mergeEtfDividendSnapshot(
  info: EtfInfoSnapshot | null,
  snapshot: DividendSnapshot | null
): DividendSnapshot | null {
  const merged: DividendSnapshot = {
    dividendYieldTtm: snapshot?.dividendYieldTtm ?? info?.dividendYield ?? null,
    dividendPerShareTtm:
      snapshot?.dividendPerShareTtm ?? info?.dividendPerShare ?? null,
    dividendPayoutRatioTtm: snapshot?.dividendPayoutRatioTtm ?? null,
    latestDividendPerShare:
      snapshot?.latestDividendPerShare ?? info?.dividendPerShare ?? null,
    latestDividendYield:
      snapshot?.latestDividendYield ?? info?.dividendYield ?? null,
    latestDividendDate: snapshot?.latestDividendDate ?? info?.exDividendDate ?? null,
    latestRecordDate: snapshot?.latestRecordDate ?? null,
    latestPaymentDate: snapshot?.latestPaymentDate ?? null,
    latestDeclarationDate: snapshot?.latestDeclarationDate ?? null,
    frequency: snapshot?.frequency ?? info?.frequency ?? null,
  }

  return Object.values(merged).some((value) => value !== null) ? merged : null
}

export function buildHistoricalPriceRows(points: PricePoint[]): HistoricalPriceRow[] {
  const series = points
    .filter((point) => point.date)
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))

  return series
    .map((point, index) => {
      const previousPoint = series[index - 1]
      const previousClose =
        previousPoint?.adjustedClose ?? previousPoint?.close ?? null
      const currentClose = point.adjustedClose ?? point.close ?? null

      return {
        date: point.date,
        open: point.open,
        high: point.high,
        low: point.low,
        close: point.close,
        adjustedClose: point.adjustedClose ?? point.close,
        changePercent:
          previousClose && currentClose
            ? ((currentClose - previousClose) / previousClose) * 100
            : null,
        volume: point.volume,
      } satisfies HistoricalPriceRow
    })
    .reverse()
}

export async function getHistoricalPriceRowsForSymbol(
  symbol: string,
  options: { limit?: number } = {}
): Promise<HistoricalPriceRow[]> {
  const normalizedSymbol = normalizeSymbol(symbol)
  const points = await withMarketCache({
    cacheKey: getEodChartCacheKey(normalizedSymbol, "full"),
    category: "chart",
    ttlSeconds: EOD_TTL_SECONDS,
    fallback: [] as PricePoint[],
    staleOnError: true,
    fetcher: () =>
      client.charts.getEodChart(normalizedSymbol, {
        limit: options.limit,
      }),
  })

  return buildHistoricalPriceRows(points)
}

export async function resolveTickerInstrumentKind(
  symbol: string
): Promise<InstrumentKind | null> {
  const normalizedSymbol = normalizeSymbol(symbol)
  const directoryEntry = await getSymbolDirectoryEntry(normalizedSymbol).catch(
    () => null
  )

  if (directoryEntry) {
    return directoryEntry.isEtf ? "etf" : "stock"
  }

  if (!(await mayUseLiveFmp())) {
    return null
  }

  const searchResults = await withMarketCache({
    cacheKey: `ticker-kind:${normalizedSymbol}`,
    category: "directory-search",
    ttlSeconds: PROFILE_TTL_SECONDS,
    fallback: [] as MarketSearchResult[],
    staleOnError: true,
    fetcher: () => client.directory.searchSymbols(normalizedSymbol),
  })

  const exactMatch = searchResults.find((result) => result.symbol === normalizedSymbol)

  if (!exactMatch) {
    return null
  }

  void upsertSymbolDirectoryEntries([
    {
      symbol: exactMatch.symbol,
      name: exactMatch.name,
      exchange: exactMatch.exchange,
      exchangeShortName: exactMatch.exchangeShortName,
      type: exactMatch.type,
      currency: exactMatch.currency,
      sector: exactMatch.sector,
      industry: exactMatch.industry,
      country: null,
      isActivelyTrading: true,
      isEtf: getInstrumentKindFromSearchResult(exactMatch) === "etf",
      updatedAt: new Date().toISOString(),
    },
  ]).catch(() => undefined)

  return getInstrumentKindFromSearchResult(exactMatch)
}

export async function getEtfDossier(symbol: string): Promise<EtfDossier> {
  const normalizedSymbol = normalizeSymbol(symbol)
  const plan = getMarketPlanSummary()
  const [info, quote, chart, intradayCharts, aftermarket, priceChange, rawDividend, dividendHistory, news, holdings, sectorAllocations, countryAllocations] =
    await Promise.all([
      withMarketCache({
        cacheKey: `etf:${normalizedSymbol}:info`,
        category: "profile",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: null,
        staleOnError: true,
        fetcher: () => client.etf.getInfo(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `etf:${normalizedSymbol}:quote`,
        category: "quotes",
        ttlSeconds: EOD_TTL_SECONDS,
        fallback: null,
        staleOnError: true,
        fetcher: () => client.quotes.getQuote(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: getEodChartCacheKey(normalizedSymbol, "full"),
        category: "chart",
        ttlSeconds: EOD_TTL_SECONDS,
        fallback: [] as PricePoint[],
        staleOnError: true,
        fetcher: () => client.charts.getEodChart(normalizedSymbol),
      }),
      getIntradayCharts(normalizedSymbol),
      getStockAftermarketSnapshot(normalizedSymbol),
      getStockPriceChangeSnapshot(normalizedSymbol),
      getStockDividendSnapshot(normalizedSymbol),
      withMarketCache({
        cacheKey: `etf:${normalizedSymbol}:dividends`,
        category: "calendar",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: [] as EtfDossier["dividendHistory"],
        staleOnError: true,
        fetcher: () => client.calendar.getDividends(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `etf:${normalizedSymbol}:news`,
        category: "news",
        ttlSeconds: NEWS_TTL_SECONDS,
        fallback: [] as EtfDossier["news"],
        staleOnError: true,
        fetcher: async () =>
          dedupeNews(await client.news.getStockNews(normalizedSymbol, 12)).slice(
            0,
            12
          ),
      }),
      withMarketCache({
        cacheKey: `etf:${normalizedSymbol}:holdings`,
        category: "etf",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: [] as EtfDossier["holdings"],
        staleOnError: true,
        fetcher: () => client.etf.getHoldings(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `etf:${normalizedSymbol}:sector-weightings`,
        category: "etf",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: [] as EtfDossier["sectorAllocations"],
        staleOnError: true,
        fetcher: () => client.etf.getSectorWeightings(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `etf:${normalizedSymbol}:country-weightings`,
        category: "etf",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: [] as EtfDossier["countryAllocations"],
        staleOnError: true,
        fetcher: () => client.etf.getCountryWeightings(normalizedSymbol),
      }),
    ])

  return {
    symbol: normalizedSymbol,
    generatedAt: new Date().toISOString(),
    plan,
    info,
    quote,
    chart,
    intradayCharts,
    aftermarket,
    priceChange,
    dividendSnapshot: mergeEtfDividendSnapshot(info, rawDividend),
    dividendHistory,
    news,
    holdings,
    sectorAllocations,
    countryAllocations,
  }
}
