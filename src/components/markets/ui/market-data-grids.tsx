import { Lock } from "lucide-react"
import Link from "next/link"

import {
  formatCurrency,
  formatLabeledMetricValue,
  formatPercent,
  formatSignedNumber,
} from "@/lib/markets-format"
import type {
  MetricStat,
  QuoteSnapshot,
} from "@/lib/shared/markets/core"
import type { LockedMarketSection } from "@/lib/shared/markets/intelligence"
import { cn } from "@/lib/utils"

import { EmptyState } from "./market-layout-primitives"
import { Sparkline } from "./sparkline"

export function QuoteStrip({
  quotes,
  hrefBase = "/stocks",
  linkItems = true,
  sparklines,
}: {
  quotes: QuoteSnapshot[]
  hrefBase?: string
  linkItems?: boolean
  sparklines?: Record<string, (number | null | undefined)[]>
}) {
  if (quotes.length === 0) {
    return (
      <EmptyState
        title="No quotes available"
        description="Quotes will appear here once market data is configured and the cache has a first fetch."
      />
    )
  }

  return (
    <div className="market-grid-4 market-panel-grid grid">
      {quotes.map((quote) => {
        const positive = (quote.change ?? 0) >= 0
        const sparklineValues = sparklines?.[quote.symbol] ?? []
        const hasSparkline =
          sparklineValues.filter(
            (value): value is number =>
              typeof value === "number" && Number.isFinite(value)
          ).length >= 2
        const content = (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-departureMono text-sm tracking-tight">
                  {quote.symbol}
                </div>
                <div className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                  {quote.name}
                </div>
              </div>
              <div
                className={cn(
                  "font-departureMono text-xs",
                  positive
                    ? "text-[color:var(--vesper-teal)]"
                    : "text-[color:var(--vesper-orange)]"
                )}
              >
                {formatPercent(quote.changesPercentage)}
              </div>
            </div>
            {hasSparkline ? (
              <Sparkline className="mt-4 h-14" values={sparklineValues} />
            ) : null}
            <div className="mt-3 flex items-end justify-between gap-3">
              <div className="text-lg tracking-tight">
                {formatCurrency(quote.price, {
                  currency: quote.currency ?? "USD",
                })}
              </div>
              <div className="text-xs text-muted-foreground">
                {formatSignedNumber(quote.change)}
              </div>
            </div>
          </>
        )

        return linkItems ? (
          <Link
            key={quote.symbol}
            className="market-panel-tile block px-3 py-2.5 transition-colors hover:bg-muted/35 sm:px-4"
            href={`${hrefBase}/${encodeURIComponent(quote.symbol)}`}
          >
            {content}
          </Link>
        ) : (
          <div key={quote.symbol} className="market-panel-tile px-3 py-2.5 sm:px-4">
            {content}
          </div>
        )
      })}
    </div>
  )
}

export function MoverGrid({ quotes }: { quotes: QuoteSnapshot[] }) {
  if (quotes.length === 0) {
    return (
      <EmptyState
        title="No movers available"
        description="This bucket will populate when the upstream market snapshot succeeds."
      />
    )
  }

  return (
    <div className="market-panel-list">
      {quotes.map((quote) => (
        <div
          key={quote.symbol}
          className="market-panel-row grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 px-3 py-2"
        >
          <div className="min-w-0">
            <div className="font-departureMono text-sm tracking-tight">
              {quote.symbol}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {quote.name}
            </div>
          </div>
          <div className="text-sm">
            {formatCurrency(quote.price, { currency: quote.currency ?? "USD" })}
          </div>
          <div
            className={cn(
              "font-departureMono text-xs",
              (quote.change ?? 0) >= 0
                ? "text-[color:var(--vesper-teal)]"
                : "text-[color:var(--vesper-orange)]"
            )}
          >
            {formatPercent(quote.changesPercentage)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function SectorGrid({
  sectors,
}: {
  sectors: { sector: string; changePercentage: number | null }[]
}) {
  if (sectors.length === 0) {
    return (
      <EmptyState
        title="No sector snapshot"
        description="Sector breadth requires a successful market performance fetch."
      />
    )
  }

  return (
    <div className="market-grid-4 market-panel-grid grid">
      {sectors.map((sector) => (
        <div key={sector.sector} className="market-panel-tile px-3 py-2.5 sm:px-4">
          <div className="text-xs text-muted-foreground">{sector.sector}</div>
          <div
            className={cn(
              "mt-3 font-departureMono text-lg tracking-tight",
              (sector.changePercentage ?? 0) >= 0
                ? "text-[color:var(--vesper-teal)]"
                : "text-[color:var(--vesper-orange)]"
            )}
          >
            {formatPercent(sector.changePercentage)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function MetricGrid({ metrics }: { metrics: MetricStat[] }) {
  if (metrics.length === 0) {
    return (
      <EmptyState
        title="No metrics available"
        description="Key metrics will populate here when the fundamentals endpoints return data."
      />
    )
  }

  return (
    <div className="market-grid-5 market-panel-grid grid">
      {metrics.map((metric) => (
        <div key={metric.label} className="market-panel-tile px-3 py-2.5 sm:px-4">
          <div className="text-xs text-muted-foreground">{metric.label}</div>
          <div className="mt-3 text-lg tracking-tight">
            {formatLabeledMetricValue(metric.label, metric.value)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function LockedSectionGrid({
  sections,
}: {
  sections: LockedMarketSection[]
}) {
  if (sections.length === 0) {
    return null
  }

  return (
    <div className="market-grid-3 market-panel-grid grid">
      {sections.map((section) => (
        <div key={section.title} className="market-panel-tile px-3 py-3 sm:px-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Lock className="size-3.5" />
            <span className="font-departureMono text-xs tracking-[0.2em] uppercase">
              Locked
            </span>
          </div>
          <div className="mt-3 text-sm">{section.title}</div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {section.description}
          </p>
        </div>
      ))}
    </div>
  )
}
