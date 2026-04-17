import type { PricePoint } from "@/lib/shared/markets/core"

import { PriceHistoryChartShell } from "./price-history-chart-shell"

export function PriceHistoryChart({
  className,
  compact = false,
  symbol,
  points,
  intradayPoints,
  currentPrice,
  sessionChange,
  sessionChangePercent,
  currency,
  historicalRangeLabel,
}: {
  className?: string
  compact?: boolean
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
    <PriceHistoryChartShell
      className={className}
      compact={compact}
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
