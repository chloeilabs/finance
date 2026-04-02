"use client"

import dynamic from "next/dynamic"

import type { PricePoint } from "@/lib/shared/markets/core"

const DynamicPriceHistoryChart = dynamic(
  () => import("./price-history-chart").then((mod) => mod.PriceHistoryChart),
  {
    ssr: false,
    loading: () => (
      <div className="market-soft-surface px-4 py-10 text-sm text-muted-foreground">
        Loading price history...
      </div>
    ),
  }
)

export function PriceHistoryChartShell({
  symbol,
  points,
  intradayPoints,
  currentPrice,
  sessionChange,
  sessionChangePercent,
  currency,
  historicalRangeLabel,
}: {
  symbol: string
  points: PricePoint[]
  intradayPoints?: PricePoint[]
  currentPrice?: number | null
  sessionChange?: number | null
  sessionChangePercent?: number | null
  currency?: string | null
  historicalRangeLabel: string
}) {
  return (
    <DynamicPriceHistoryChart
      currentPrice={currentPrice}
      symbol={symbol}
      points={points}
      intradayPoints={intradayPoints}
      sessionChange={sessionChange}
      sessionChangePercent={sessionChangePercent}
      currency={currency}
      historicalRangeLabel={historicalRangeLabel}
    />
  )
}
