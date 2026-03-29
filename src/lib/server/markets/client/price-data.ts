import type {
  PricePoint,
  TechnicalIndicatorSeries,
} from "@/lib/shared/markets/core"
import type { FmpIntradayInterval } from "@/lib/shared/markets/plan"

import { fetchFmpJson } from "../fmp-request"
import { asArray, asRecord, pickNumber, pickString } from "./support"

function mapPricePoint(item: unknown): PricePoint | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const date = pickString(record, ["date"])

  if (!date) {
    return null
  }

  return {
    date,
    open: pickNumber(record, ["open"]),
    high: pickNumber(record, ["high"]),
    low: pickNumber(record, ["low"]),
    close: pickNumber(record, ["close", "price"]),
    volume: pickNumber(record, ["volume"]),
  }
}

function mapTechnicalSeries(
  items: unknown[],
  params: {
    id: string
    label: string
    field: string
  }
): TechnicalIndicatorSeries {
  return {
    id: params.id,
    label: params.label,
    points: items
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null)
      .map((record) => ({
        date: pickString(record, ["date"]) ?? "",
        value: pickNumber(record, [params.field]),
      }))
      .filter((point) => point.date !== "")
      .reverse(),
  }
}

export function createPriceDataClient() {
  return {
    charts: {
      async getEodChart(
        symbol: string,
        options?: { limit?: number }
      ): Promise<PricePoint[]> {
        const payload = await fetchFmpJson(
          "/stable/historical-price-eod/light",
          {
            symbol,
            limit: options?.limit,
          }
        )

        return asArray(payload)
          .map(mapPricePoint)
          .filter((item): item is PricePoint => item !== null)
          .reverse()
      },
      async getIntradayChart(
        symbol: string,
        interval: FmpIntradayInterval
      ): Promise<PricePoint[]> {
        const payload = await fetchFmpJson(
          `/stable/historical-chart/${interval}`,
          {
            symbol,
          }
        )

        return asArray(payload)
          .map(mapPricePoint)
          .filter((item): item is PricePoint => item !== null)
          .slice(0, 120)
          .reverse()
      },
    },
    technicals: {
      async getCoreIndicators(
        symbol: string
      ): Promise<TechnicalIndicatorSeries[]> {
        const [sma20, sma50, ema20, rsi14] = await Promise.all([
          fetchFmpJson("/stable/technical-indicators/sma", {
            symbol,
            periodLength: 20,
            timeframe: "1day",
          }).catch(() => []),
          fetchFmpJson("/stable/technical-indicators/sma", {
            symbol,
            periodLength: 50,
            timeframe: "1day",
          }).catch(() => []),
          fetchFmpJson("/stable/technical-indicators/ema", {
            symbol,
            periodLength: 20,
            timeframe: "1day",
          }).catch(() => []),
          fetchFmpJson("/stable/technical-indicators/rsi", {
            symbol,
            periodLength: 14,
            timeframe: "1day",
          }).catch(() => []),
        ])

        return [
          mapTechnicalSeries(asArray(sma20), {
            id: "sma20",
            label: "SMA 20",
            field: "sma",
          }),
          mapTechnicalSeries(asArray(sma50), {
            id: "sma50",
            label: "SMA 50",
            field: "sma",
          }),
          mapTechnicalSeries(asArray(ema20), {
            id: "ema20",
            label: "EMA 20",
            field: "ema",
          }),
          mapTechnicalSeries(asArray(rsi14), {
            id: "rsi14",
            label: "RSI 14",
            field: "rsi",
          }),
        ]
      },
    },
  }
}
