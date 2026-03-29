import "server-only"

import type {
  AssetMarketGroup,
  AssetMarketGroupId,
  FilingEntry,
  LatestInsiderTradeEntry,
  MultiAssetMarketData,
} from "@/lib/shared/markets/intelligence"

import { withMarketCache } from "./cache"
import { getMarketPlanSummary, isCapabilityEnabled } from "./config"
import { createMarketDateClock } from "./market-clock"
import {
  client,
  COMPARE_SYMBOL_LIMIT,
  CORE_COMMODITY_SYMBOLS,
  CORE_CRYPTO_SYMBOLS,
  CORE_FOREX_SYMBOLS,
  CORE_WATCHLIST_SYMBOLS,
  EOD_TTL_SECONDS,
  FILINGS_TTL_SECONDS,
  getCachedQuoteSnapshot,
  getEodChartCacheKey,
  getIntradayChartCacheKey,
  INSIDER_TTL_SECONDS,
  mapWithConcurrency,
  QUOTE_FETCH_CONCURRENCY,
} from "./service-support"

const ASSET_GROUPS: {
  capability: "cryptoMarkets" | "forexMarkets" | "commodityMarkets"
  description: string
  id: AssetMarketGroupId
  symbols: readonly string[]
  title: string
}[] = [
  {
    capability: "cryptoMarkets",
    description:
      "Starter-safe crypto majors with live quotes, 5-minute tape, and compact EOD context.",
    id: "crypto",
    symbols: CORE_CRYPTO_SYMBOLS,
    title: "Crypto",
  },
  {
    capability: "forexMarkets",
    description:
      "Core FX pairs surfaced through the same Starter key without a separate data provider.",
    id: "forex",
    symbols: CORE_FOREX_SYMBOLS,
    title: "Forex",
  },
  {
    capability: "commodityMarkets",
    description:
      "Validated commodity futures symbols that respond on Starter today.",
    id: "commodities",
    symbols: CORE_COMMODITY_SYMBOLS,
    title: "Commodities",
  },
] as const

function compareDescending(left: string | null, right: string | null) {
  return (right ?? "").localeCompare(left ?? "")
}

function dedupeFilings(items: FilingEntry[]) {
  const seen = new Set<string>()

  return items.filter((item, index) => {
    const key =
      item.finalLink ??
      [
        item.symbol ?? "symbol",
        item.formType ?? "form",
        item.filingDate ?? "date",
        String(index),
      ].join(":")

    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

async function getAssetGroupSnapshot(
  group: (typeof ASSET_GROUPS)[number]
): Promise<AssetMarketGroup> {
  const items = await mapWithConcurrency(
    [...group.symbols],
    QUOTE_FETCH_CONCURRENCY,
    async (symbol) => {
      const [quote, intradayChart, eodChart] = await Promise.all([
        getCachedQuoteSnapshot(symbol),
        withMarketCache({
          cacheKey: getIntradayChartCacheKey(symbol, "5min"),
          category: "chart",
          ttlSeconds: EOD_TTL_SECONDS,
          fallback: [],
          allowLive: isCapabilityEnabled("intradayCharts"),
          staleOnError: true,
          fetcher: () => client.charts.getIntradayChart(symbol, "5min"),
        }),
        withMarketCache({
          cacheKey: getEodChartCacheKey(symbol, "compact"),
          category: "chart",
          ttlSeconds: EOD_TTL_SECONDS,
          fallback: [],
          staleOnError: true,
          fetcher: () => client.charts.getEodChart(symbol, { limit: 30 }),
        }),
      ])

      return {
        symbol,
        quote,
        intradayChart: intradayChart.slice(-48),
        eodChart: eodChart.slice(-30),
      }
    }
  )

  return {
    id: group.id,
    title: group.title,
    description: group.description,
    items: items.filter(
      (item) =>
        item.quote !== null ||
        item.intradayChart.length > 0 ||
        item.eodChart.length > 0
    ),
  }
}

export async function getMultiAssetSnapshot(): Promise<MultiAssetMarketData> {
  const groups = await Promise.all(
    ASSET_GROUPS.filter((group) => isCapabilityEnabled(group.capability)).map(
      (group) => getAssetGroupSnapshot(group)
    )
  )

  return {
    plan: getMarketPlanSummary(),
    groups,
  }
}

export async function getLatestInsiderFeed(
  limit = 8
): Promise<LatestInsiderTradeEntry[]> {
  return withMarketCache({
    cacheKey: `insider:latest:${String(limit)}`,
    category: "insider",
    ttlSeconds: INSIDER_TTL_SECONDS,
    fallback: [] as LatestInsiderTradeEntry[],
    allowLive: isCapabilityEnabled("latestInsiderFeed"),
    staleOnError: true,
    fetcher: () => client.insider.getLatestInsiderTrades(limit),
  })
}

export async function getLatestSecActivity(
  symbols = [...CORE_WATCHLIST_SYMBOLS].slice(0, COMPARE_SYMBOL_LIMIT),
  limit = 8
): Promise<FilingEntry[]> {
  const clock = createMarketDateClock()
  const from = clock.minusDays(45)
  const to = clock.today

  const filings = await mapWithConcurrency(
    [
      ...new Set(
        symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)
      ),
    ],
    QUOTE_FETCH_CONCURRENCY,
    (symbol) =>
      withMarketCache({
        cacheKey: `feed:filings:${symbol}:${from}:${to}`,
        category: "filings",
        ttlSeconds: FILINGS_TTL_SECONDS,
        fallback: [] as FilingEntry[],
        allowLive: isCapabilityEnabled("secFilings"),
        staleOnError: true,
        fetcher: () =>
          client.filings.getSecFilings(symbol, from, to, { limit }),
      })
  )

  return dedupeFilings(filings.flat())
    .sort((left, right) => compareDescending(left.filingDate, right.filingDate))
    .slice(0, limit)
}
