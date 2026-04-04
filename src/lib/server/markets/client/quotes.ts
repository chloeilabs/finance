import type {
  AftermarketSnapshot,
  MarketMoverBucket,
  PriceChangeSnapshot,
  QuoteSnapshot,
  SectorSnapshot,
} from "@/lib/shared/markets/core"

import { fetchFmpJson } from "../fmp-request"
import {
  asArray,
  asRecord,
  dedupeSymbols,
  pickNumber,
  pickString,
} from "./support"

const CORE_INDEX_SYMBOL_ORDER = ["^GSPC", "^IXIC", "^DJI"] as const
const BENCHMARK_SYMBOL_ORDER = [...CORE_INDEX_SYMBOL_ORDER, "BTCUSD"] as const

function mapQuote(item: unknown): QuoteSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const symbol = pickString(record, ["symbol"])

  if (!symbol) {
    return null
  }

  return {
    symbol,
    name: pickString(record, ["name"]) ?? symbol,
    price: pickNumber(record, ["price"]),
    change: pickNumber(record, ["change"]),
    changesPercentage: pickNumber(record, [
      "changePercentage",
      "changesPercentage",
      "changesPercentage1D",
    ]),
    open: pickNumber(record, ["open"]),
    dayLow: pickNumber(record, ["dayLow", "low"]),
    dayHigh: pickNumber(record, ["dayHigh", "high"]),
    yearLow: pickNumber(record, ["yearLow"]),
    yearHigh: pickNumber(record, ["yearHigh"]),
    volume: pickNumber(record, ["volume"]),
    avgVolume: pickNumber(record, ["avgVolume"]),
    marketCap: pickNumber(record, ["marketCap"]),
    priceAvg50: pickNumber(record, ["priceAvg50"]),
    priceAvg200: pickNumber(record, ["priceAvg200"]),
    exchange: pickString(record, ["exchange", "exchangeShortName"]),
    currency: pickString(record, ["currency"]),
    timestamp: pickString(record, ["timestamp", "date"]),
  }
}

function mapAftermarketSnapshot(
  tradeItem: unknown,
  quoteItem: unknown
): AftermarketSnapshot | null {
  const trade = asRecord(tradeItem)
  const quote = asRecord(quoteItem)

  if (!trade && !quote) {
    return null
  }

  return {
    lastTradePrice: trade ? pickNumber(trade, ["price"]) : null,
    lastTradeTimestamp: trade ? pickString(trade, ["timestamp", "date"]) : null,
    bidPrice: quote ? pickNumber(quote, ["bidPrice"]) : null,
    askPrice: quote ? pickNumber(quote, ["askPrice"]) : null,
    volume: quote ? pickNumber(quote, ["volume"]) : null,
    quoteTimestamp: quote ? pickString(quote, ["timestamp", "date"]) : null,
  }
}

function mapPriceChange(item: unknown): PriceChangeSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    day1: pickNumber(record, ["1D"]),
    day5: pickNumber(record, ["5D"]),
    month1: pickNumber(record, ["1M"]),
    month3: pickNumber(record, ["3M"]),
    month6: pickNumber(record, ["6M"]),
    ytd: pickNumber(record, ["ytd", "YTD"]),
    year1: pickNumber(record, ["1Y"]),
    year3: pickNumber(record, ["3Y"]),
    year5: pickNumber(record, ["5Y"]),
    year10: pickNumber(record, ["10Y"]),
    max: pickNumber(record, ["max"]),
  }
}

function pickQuotesBySymbolOrder(
  quotes: QuoteSnapshot[],
  symbols: readonly string[]
): QuoteSnapshot[] {
  const quotesBySymbol = new Map<string, QuoteSnapshot>()

  for (const quote of quotes) {
    quotesBySymbol.set(quote.symbol, quote)
  }

  return symbols.flatMap((symbol) => {
    const quote = quotesBySymbol.get(symbol)
    return quote ? [quote] : []
  })
}

export function createQuotesClient() {
  return {
    async getQuote(symbol: string): Promise<QuoteSnapshot | null> {
      const payload = await fetchFmpJson("/stable/quote", { symbol })
      return mapQuote(asArray(payload)[0])
    },
    async getAftermarketSnapshot(
      symbol: string
    ): Promise<AftermarketSnapshot | null> {
      const [trade, quote] = await Promise.all([
        fetchFmpJson("/stable/aftermarket-trade", { symbol }).catch(() => []),
        fetchFmpJson("/stable/aftermarket-quote", { symbol }).catch(() => []),
      ])

      return mapAftermarketSnapshot(asArray(trade)[0], asArray(quote)[0])
    },
    async getPriceChange(symbol: string): Promise<PriceChangeSnapshot | null> {
      const payload = await fetchFmpJson("/stable/stock-price-change", {
        symbol,
      })

      return mapPriceChange(asArray(payload)[0])
    },
    async getBatchQuotes(symbols: string[]): Promise<QuoteSnapshot[]> {
      const normalizedSymbols = dedupeSymbols(symbols)

      if (normalizedSymbols.length === 0) {
        return []
      }

      const payload = await fetchFmpJson("/stable/batch-quote", {
        symbols: normalizedSymbols.join(","),
      })

      return asArray(payload)
        .map(mapQuote)
        .filter((item): item is QuoteSnapshot => item !== null)
    },
    async getIndexQuotes(): Promise<QuoteSnapshot[]> {
      const [payload, bitcoinPayload] = await Promise.all([
        fetchFmpJson("/stable/batch-index-quotes"),
        fetchFmpJson("/stable/quote", { symbol: "BTCUSD" }).catch(() => []),
      ])
      const wanted = new Set<string>(BENCHMARK_SYMBOL_ORDER)
      const quotes = [...asArray(payload), ...asArray(bitcoinPayload)]
        .map(mapQuote)
        .filter(
          (item): item is QuoteSnapshot =>
            item !== null && wanted.has(item.symbol)
        )

      return pickQuotesBySymbolOrder(quotes, BENCHMARK_SYMBOL_ORDER)
    },
    async getMovers(): Promise<MarketMoverBucket[]> {
      const [gainers, losers, actives] = await Promise.all([
        fetchFmpJson("/stable/biggest-gainers"),
        fetchFmpJson("/stable/biggest-losers"),
        fetchFmpJson("/stable/most-actives"),
      ])

      return [
        {
          label: "Leaders",
          items: asArray(gainers)
            .map(mapQuote)
            .filter((item): item is QuoteSnapshot => item !== null)
            .slice(0, 6),
        },
        {
          label: "Laggards",
          items: asArray(losers)
            .map(mapQuote)
            .filter((item): item is QuoteSnapshot => item !== null)
            .slice(0, 6),
        },
        {
          label: "Most Active",
          items: asArray(actives)
            .map(mapQuote)
            .filter((item): item is QuoteSnapshot => item !== null)
            .slice(0, 6),
        },
      ]
    },
    async getSectorPerformance(date?: string): Promise<SectorSnapshot[]> {
      const payload = await fetchFmpJson("/stable/sector-performance-snapshot", {
        date,
      })

      return asArray(payload)
        .map((item) => {
          const record = asRecord(item)
          if (!record) {
            return null
          }

          const sector = pickString(record, ["sector"])
          if (!sector) {
            return null
          }

          return {
            sector,
            changePercentage: pickNumber(record, [
              "averageChange",
              "changesPercentage",
              "changePercentage",
            ]),
          }
        })
        .filter((item): item is SectorSnapshot => item !== null)
    },
  }
}
