import "server-only"

import type {
  CalendarEvent,
  MetricStat,
  NewsStory,
} from "@/lib/shared/markets/core"
import type {
  AnalystEstimateSnapshot,
  AnalystSummary,
  GradesConsensus,
  RatingsHistoricalEntry,
  StockDossier,
} from "@/lib/shared/markets/intelligence"

import { withMarketCache } from "./cache"
import { isCapabilityEnabled } from "./config"
import { createMarketDateClock } from "./market-clock"
import {
  getIntradayCharts,
  getStockAftermarketSnapshot,
  getStockAnalystEstimates,
  getStockEmployeeHistory,
  getStockFinancialScores,
  getStockGeographicSegments,
  getStockGradesConsensus,
  getStockMarketCapHistory,
  getStockPeerComparison,
  getStockPriceChangeSnapshot,
  getStockProductSegments,
  getStockRatingsHistory,
  getStockSecProfile,
  getStockTechnicals,
} from "./service-dossier-fetchers"
import { getStockDossierOverview } from "./service-dossier-overview"
import {
  ANALYST_TTL_SECONDS,
  CALENDAR_TTL_SECONDS,
  client,
  compactTables,
  dedupeCalendarEvents,
  dedupeNews,
  FILINGS_TTL_SECONDS,
  INSIDER_TTL_SECONDS,
  NEWS_TTL_SECONDS,
  normalizeSymbol,
  PROFILE_TTL_SECONDS,
} from "./service-support"

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
      staleOnError: true,
      fetcher: () => client.fundamentals.getIncomeStatement(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:balance`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: null,
      staleOnError: true,
      fetcher: () => client.fundamentals.getBalanceSheet(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:cash-flow`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: null,
      staleOnError: true,
      fetcher: () => client.fundamentals.getCashFlow(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:growth`,
      category: "fundamentals",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as MetricStat[],
      staleOnError: true,
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
  const clock = createMarketDateClock()
  const latestNewsKey = `stock:${normalizedSymbol}:news:${clock.today}`
  const filingsFrom = clock.minusDays(180)
  const filingsTo = clock.today
  const [dividends, earnings, splits, companyNews, secFilings] =
    await Promise.all([
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:dividends`,
        category: "calendar",
        ttlSeconds: CALENDAR_TTL_SECONDS,
        fallback: [] as CalendarEvent[],
        staleOnError: true,
        fetcher: () => client.calendar.getDividends(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:earnings`,
        category: "calendar",
        ttlSeconds: CALENDAR_TTL_SECONDS,
        fallback: [] as CalendarEvent[],
        staleOnError: true,
        fetcher: () => client.calendar.getEarnings(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:splits`,
        category: "calendar",
        ttlSeconds: CALENDAR_TTL_SECONDS,
        fallback: [] as CalendarEvent[],
        staleOnError: true,
        fetcher: () => client.calendar.getSplits(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: latestNewsKey,
        category: "news",
        ttlSeconds: NEWS_TTL_SECONDS,
        fallback: [] as NewsStory[],
        staleOnError: true,
        fetcher: () => client.news.getStockNews(normalizedSymbol, 10),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:filings:${filingsFrom}:${filingsTo}`,
        category: "filings",
        ttlSeconds: FILINGS_TTL_SECONDS,
        fallback: [] as StockDossier["filings"],
        allowLive: isCapabilityEnabled("secFilings"),
        staleOnError: true,
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
  ]: [
    AnalystSummary | null,
    GradesConsensus | null,
    AnalystEstimateSnapshot[],
    RatingsHistoricalEntry[],
    StockDossier["financialScores"],
    StockDossier["insiderTrades"],
    StockDossier["ownership"],
    StockDossier["etfExposure"],
  ] = await Promise.all([
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:analyst`,
      category: "analyst",
      ttlSeconds: ANALYST_TTL_SECONDS,
      fallback: null,
      allowLive: isCapabilityEnabled("analystInsights"),
      staleOnError: true,
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
      staleOnError: true,
      fetcher: () => client.insider.getInsiderTrades(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:ownership`,
      category: "ownership",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as StockDossier["ownership"],
      allowLive: isCapabilityEnabled("ownership"),
      staleOnError: true,
      fetcher: () =>
        client.ownership.getInstitutionalOwnership(normalizedSymbol),
    }),
    withMarketCache({
      cacheKey: `stock:${normalizedSymbol}:etf-exposure`,
      category: "etf",
      ttlSeconds: PROFILE_TTL_SECONDS,
      fallback: [] as StockDossier["etfExposure"],
      allowLive: isCapabilityEnabled("etfAssetExposure"),
      staleOnError: true,
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
  const [trading, financial, context, streetView, business] = await Promise.all(
    [
      getStockDossierTradingSection(overview.symbol),
      getStockDossierFinancialSection(overview.symbol),
      getStockDossierContextSection(overview.symbol),
      getStockDossierStreetViewSection(overview.symbol),
      getStockDossierBusinessSection(overview.symbol),
    ]
  )

  return {
    ...overview,
    ...trading,
    ...financial,
    ...context,
    ...streetView,
    ...business,
  }
}
