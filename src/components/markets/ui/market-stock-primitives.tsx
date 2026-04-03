import { Button } from "@/components/ui/button"
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
  exchange,
  sector,
  industry,
  website,
}: {
  symbol: string
  name: string | null
  price: number | null
  change: number | null
  changesPercentage: number | null
  currency?: string | null
  exchange?: string | null
  sector?: string | null
  industry?: string | null
  website?: string | null
}) {
  const positive = (change ?? 0) >= 0
  const businessLine = [sector, industry].filter(Boolean).join(" / ")
  const headlineEyebrow = `${exchange ?? "Stock"} / ${symbol}`

  return (
    <div className="market-soft-surface px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="font-departureMono text-[11px] tracking-[0.26em] text-muted-foreground uppercase">
            {headlineEyebrow}
          </div>
          <div className="mt-3 text-3xl tracking-tight sm:text-4xl">
            {name ?? symbol}
          </div>
          {businessLine ? (
            <div className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              {businessLine}
            </div>
          ) : null}
        </div>

        {website ? (
          <Button asChild size="sm" variant="outline">
            <a href={website} rel="noreferrer noopener" target="_blank">
              Company Site
            </a>
          </Button>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="text-3xl tracking-tight sm:text-4xl">
          {formatCurrency(price, { currency: currency ?? "USD" })}
        </div>
        <div
          className={cn(
            "font-departureMono text-sm sm:text-base",
            positive
              ? "text-[color:var(--vesper-teal)]"
              : "text-[color:var(--vesper-orange)]"
          )}
        >
          {formatSignedNumber(change)} / {formatPercent(changesPercentage)}
        </div>
      </div>
    </div>
  )
}

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
