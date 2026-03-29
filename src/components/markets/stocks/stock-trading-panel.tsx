"use client"

import { useState } from "react"

import { Sparkline } from "@/components/markets/ui/sparkline"
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
} from "@/lib/markets-format"
import type {
  AftermarketSnapshot,
  PriceChangeSnapshot,
  PricePoint,
} from "@/lib/shared/markets/core"
import type { FmpIntradayInterval } from "@/lib/shared/markets/plan"

const INTERVAL_LABELS: Record<FmpIntradayInterval, string> = {
  "1min": "1m",
  "5min": "5m",
  "15min": "15m",
  "30min": "30m",
  "1hour": "1h",
  "4hour": "4h",
}

const CHANGE_ITEMS: {
  key: keyof PriceChangeSnapshot
  label: string
}[] = [
  { key: "day1", label: "1D" },
  { key: "day5", label: "5D" },
  { key: "month1", label: "1M" },
  { key: "month3", label: "3M" },
  { key: "month6", label: "6M" },
  { key: "ytd", label: "YTD" },
  { key: "year1", label: "1Y" },
] as const

function getSeriesValues(points: PricePoint[]) {
  return points.map((point) => point.close)
}

export function StockTradingPanel({
  currency,
  intradayCharts,
  aftermarket,
  priceChange,
}: {
  currency?: string | null
  intradayCharts: Partial<Record<FmpIntradayInterval, PricePoint[]>>
  aftermarket: AftermarketSnapshot | null
  priceChange: PriceChangeSnapshot | null
}) {
  const intervals = Object.keys(intradayCharts) as FmpIntradayInterval[]
  const [selectedInterval, setSelectedInterval] = useState<FmpIntradayInterval>(
    intervals[0] ?? "5min"
  )
  const points = intradayCharts[selectedInterval] ?? []

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {intervals.map((interval) => (
          <button
            key={interval}
            className="market-chip px-3 py-1 text-xs transition-colors hover:bg-muted/60"
            type="button"
            onClick={() => {
              setSelectedInterval(interval)
            }}
          >
            {INTERVAL_LABELS[interval]}
          </button>
        ))}
      </div>

      <div className="market-split-18 grid gap-3">
        <div className="market-soft-surface px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Intraday
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {INTERVAL_LABELS[selectedInterval]} price path
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {points.length} bars
            </div>
          </div>
          <Sparkline className="mt-6 h-32" values={getSeriesValues(points)} />
        </div>

        <div className="market-panel-list">
          <div className="market-panel-tile px-3 py-2.5 sm:px-4">
            <div className="text-xs text-muted-foreground">
              Aftermarket trade
            </div>
            <div className="mt-2 text-lg tracking-tight">
              {formatCurrency(aftermarket?.lastTradePrice, {
                currency: currency ?? "USD",
              })}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(aftermarket?.lastTradeTimestamp)}
            </div>
          </div>
          <div className="market-panel-tile px-3 py-2.5 sm:px-4">
            <div className="text-xs text-muted-foreground">Bid / Ask</div>
            <div className="mt-2 text-sm">
              {formatCurrency(aftermarket?.bidPrice, {
                currency: currency ?? "USD",
              })}{" "}
              /{" "}
              {formatCurrency(aftermarket?.askPrice, {
                currency: currency ?? "USD",
              })}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {formatDateTime(aftermarket?.quoteTimestamp)}
            </div>
          </div>
        </div>
      </div>

      <div className="market-grid-7 market-panel-grid grid">
        {CHANGE_ITEMS.map((item) => (
          <div key={item.key} className="market-panel-tile px-3 py-2.5 sm:px-4">
            <div className="text-xs text-muted-foreground">{item.label}</div>
            <div className="mt-2 font-departureMono text-sm tracking-tight">
              {formatPercent(priceChange?.[item.key])}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
