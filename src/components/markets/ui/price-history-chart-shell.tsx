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
  currency,
  historicalRangeLabel,
}: {
  symbol: string
  points: PricePoint[]
  currency?: string | null
  historicalRangeLabel: string
}) {
  return (
    <DynamicPriceHistoryChart
      symbol={symbol}
      points={points}
      currency={currency}
      historicalRangeLabel={historicalRangeLabel}
    />
  )
}
