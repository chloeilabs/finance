import {
  formatCurrency,
  formatPercent,
  formatSignedNumber,
} from "@/lib/markets-format"
import type { PricePoint } from "@/lib/shared/markets/core"
import { cn } from "@/lib/utils"

import { PriceHistoryChartShell } from "./price-history-chart-shell"

export function StockHeadline({
  symbol,
  name,
  price,
  change,
  changesPercentage,
  currency,
}: {
  symbol: string
  name: string | null
  price: number | null
  change: number | null
  changesPercentage: number | null
  currency?: string | null
}) {
  const positive = (change ?? 0) >= 0

  return (
    <div className="market-split-18 market-panel-grid grid">
      <div className="market-panel-tile px-4 py-4 sm:px-5">
        <div className="font-departureMono text-[11px] tracking-[0.26em] text-muted-foreground uppercase">
          {symbol}
        </div>
        <div className="mt-2 text-2xl tracking-tight sm:text-3xl">
          {name ?? symbol}
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="text-2xl tracking-tight">
            {formatCurrency(price, { currency: currency ?? "USD" })}
          </div>
          <div
            className={cn(
              "font-departureMono text-sm",
              positive
                ? "text-[color:var(--vesper-teal)]"
                : "text-[color:var(--vesper-orange)]"
            )}
          >
            {formatSignedNumber(change)} / {formatPercent(changesPercentage)}
          </div>
        </div>
      </div>
      <div className="market-panel-list">
        <div className="market-panel-tile px-3 py-2.5 sm:px-4">
          <div className="text-xs text-muted-foreground">Session change</div>
          <div
            className={cn(
              "mt-2 font-departureMono text-sm",
              positive
                ? "text-[color:var(--vesper-teal)]"
                : "text-[color:var(--vesper-orange)]"
            )}
          >
            {formatSignedNumber(change)} / {formatPercent(changesPercentage)}
          </div>
        </div>
        <div className="market-panel-tile px-3 py-2.5 sm:px-4">
          <div className="text-xs text-muted-foreground">Currency</div>
          <div className="mt-2 text-sm">{currency ?? "USD"}</div>
        </div>
      </div>
    </div>
  )
}

export function PriceHistoryChart({
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
    <PriceHistoryChartShell
      symbol={symbol}
      points={points}
      currency={currency}
      historicalRangeLabel={historicalRangeLabel}
    />
  )
}
