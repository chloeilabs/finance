import "server-only"

import type { MetricStat } from "@/lib/shared/markets/core"
import type {
  LockedMarketSection,
  StockDossier,
} from "@/lib/shared/markets/intelligence"

import { withMarketCache } from "./cache"
import { getMarketPlanSummary, getQuoteCacheTtlSeconds } from "./config"
import { getStockValuationSnapshot } from "./service-dossier-fetchers"
import {
  buildLockedSection,
  client,
  compactMetricStats,
  EOD_TTL_SECONDS,
  getEodChartCacheKey,
  normalizeSymbol,
  PROFILE_TTL_SECONDS,
} from "./service-support"
import { getSymbolDirectoryEntry } from "./store"

function resolveLockedSections(
  plan: ReturnType<typeof getMarketPlanSummary>
): LockedMarketSection[] {
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

export async function getStockOverviewCore(symbol: string) {
  const normalizedSymbol = normalizeSymbol(symbol)
  const [profile, quote, chart, keyMetrics, ratioMetrics, ratings, valuation] =
    await Promise.all([
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:profile`,
        category: "profile",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: null,
        staleOnError: true,
        fetcher: () => client.company.getProfile(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:quote`,
        category: "quotes",
        ttlSeconds: getQuoteCacheTtlSeconds(),
        fallback: null,
        staleOnError: true,
        fetcher: () => client.quotes.getQuote(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: getEodChartCacheKey(normalizedSymbol),
        category: "chart",
        ttlSeconds: EOD_TTL_SECONDS,
        fallback: [] as StockDossier["chart"],
        staleOnError: true,
        fetcher: () => client.charts.getEodChart(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:key-metrics`,
        category: "fundamentals",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: [] as MetricStat[],
        staleOnError: true,
        fetcher: () => client.fundamentals.getKeyMetricsTtm(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:ratios`,
        category: "fundamentals",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: [] as MetricStat[],
        staleOnError: true,
        fetcher: () => client.fundamentals.getRatiosTtm(normalizedSymbol),
      }),
      withMarketCache({
        cacheKey: `stock:${normalizedSymbol}:ratings`,
        category: "fundamentals",
        ttlSeconds: PROFILE_TTL_SECONDS,
        fallback: [] as MetricStat[],
        staleOnError: true,
        fetcher: () => client.fundamentals.getRatingsSnapshot(normalizedSymbol),
      }),
      getStockValuationSnapshot(normalizedSymbol),
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
