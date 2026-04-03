import Link from "next/link"

import { EmptyState } from "@/components/markets/ui/market-layout-primitives"
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/markets-format"
import { cn } from "@/lib/utils"

export interface TickerWidgetRow {
  label: string
  tone?: "negative" | "positive"
  value: React.ReactNode
}

export interface TickerMiniBarDatum {
  label: string
  secondaryValue?: number | null
  value: number | null
}

export interface TickerProgressDatum {
  label: string
  tone?: "negative" | "positive"
  value: number | null
}

function getToneClass(tone?: "negative" | "positive") {
  if (tone === "positive") {
    return "text-[color:var(--vesper-teal)]"
  }

  if (tone === "negative") {
    return "text-[color:var(--vesper-orange)]"
  }

  return undefined
}

function getBarClass(value: number | null | undefined, accent?: "secondary") {
  if ((value ?? 0) < 0) {
    return "bg-[color:var(--vesper-orange)]"
  }

  if (accent === "secondary") {
    return "bg-[color:var(--vesper-teal)]"
  }

  return "bg-primary"
}

function getNumericString(
  value: string | null | undefined,
  currency?: string | null
) {
  if (!value) {
    return "N/A"
  }

  const cleaned = value.replace(/[$,%\s,]/g, "")
  const numeric = Number(cleaned)

  if (!Number.isFinite(numeric)) {
    return value
  }

  return formatCurrency(numeric, { currency: currency ?? "USD" })
}

export function TickerWidget({
  actionHref,
  actionLabel,
  children,
  className,
  description,
  title,
}: {
  actionHref?: string
  actionLabel?: string
  children: React.ReactNode
  className?: string
  description?: string
  title: string
}) {
  return (
    <section className={cn("market-soft-surface px-4 py-4 sm:px-5", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
          {description ? (
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actionHref && actionLabel ? (
          <Link
            className="shrink-0 pt-1 text-xs text-primary hover:underline"
            href={actionHref}
          >
            {actionLabel}
          </Link>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  )
}

export function TickerValueTable({
  rows,
}: {
  rows: TickerWidgetRow[]
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        description="This dataset is unavailable for the current symbol."
        title="No supporting data"
      />
    )
  }

  return (
    <div className="market-table-frame overflow-hidden">
      <table className="min-w-full border-collapse text-sm">
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.label}:${String(index)}`}
              className="border-b border-border/35 last:border-b-0"
            >
              <td className="px-3 py-2 text-muted-foreground">{row.label}</td>
              <td
                className={cn(
                  "px-3 py-2 text-right font-medium",
                  getToneClass(row.tone)
                )}
              >
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function TickerFactGrid({
  items,
  columns = 2,
}: {
  columns?: 1 | 2
  items: TickerWidgetRow[]
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        description="Reference details will appear here when profile coverage is available."
        title="No profile facts"
      />
    )
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        columns === 2 ? "sm:grid-cols-2" : "grid-cols-1"
      )}
    >
      {items.map((item, index) => (
        <div key={`${item.label}:${String(index)}`}>
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className={cn("mt-1 text-sm", getToneClass(item.tone))}>
            {item.value}
          </div>
        </div>
      ))}
    </div>
  )
}

export function TickerMiniBarChart({
  data,
  emptyDescription = "Trend data will appear here when enough history is available.",
  emptyTitle = "No trend data",
  primaryFormatter,
  primaryLegend,
  secondaryFormatter,
  secondaryLegend,
}: {
  data: TickerMiniBarDatum[]
  emptyDescription?: string
  emptyTitle?: string
  primaryFormatter: (value: number | null) => string
  primaryLegend: string
  secondaryFormatter?: (value: number | null) => string
  secondaryLegend?: string
}) {
  const valid = data.filter(
    (item) => item.value !== null || item.secondaryValue !== null
  )

  if (valid.length === 0) {
    return <EmptyState description={emptyDescription} title={emptyTitle} />
  }

  const maxValue = valid.reduce((max, item) => {
    return Math.max(
      max,
      Math.abs(item.value ?? 0),
      Math.abs(item.secondaryValue ?? 0)
    )
  }, 0)

  const denominator = maxValue === 0 ? 1 : maxValue

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="block h-2.5 w-2.5 bg-primary" />
          <span>{primaryLegend}</span>
        </div>
        {secondaryLegend ? (
          <div className="flex items-center gap-2">
            <span className="block h-2.5 w-2.5 bg-[color:var(--vesper-teal)]" />
            <span>{secondaryLegend}</span>
          </div>
        ) : null}
      </div>

      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${String(valid.length)}, minmax(0, 1fr))`,
        }}
      >
        {valid.map((item, index) => {
          const primaryHeight = `${String(
            Math.max(8, (Math.abs(item.value ?? 0) / denominator) * 100)
          )}%`
          const secondaryHeight = `${String(
            Math.max(8, (Math.abs(item.secondaryValue ?? 0) / denominator) * 100)
          )}%`

          return (
            <div key={`${item.label}:${String(index)}`} className="min-w-0">
              <div className="flex h-36 items-end justify-center gap-1.5 border border-border/45 bg-background/55 px-2 pb-2 pt-4">
                {item.value !== null ? (
                  <div
                    className={cn("w-3", getBarClass(item.value))}
                    style={{ height: primaryHeight }}
                  />
                ) : (
                  <div className="w-3" />
                )}
                {secondaryLegend ? (
                  item.secondaryValue !== null ? (
                    <div
                      className={cn("w-3", getBarClass(item.secondaryValue, "secondary"))}
                      style={{ height: secondaryHeight }}
                    />
                  ) : (
                    <div className="w-3" />
                  )
                ) : null}
              </div>

              <div className="mt-2 text-center">
                <div className="text-[11px] text-muted-foreground">{item.label}</div>
                <div className="mt-1 text-xs font-medium">
                  {primaryFormatter(item.value)}
                </div>
                {secondaryLegend && secondaryFormatter ? (
                  <div className="mt-0.5 text-[11px] text-muted-foreground">
                    {secondaryFormatter(item.secondaryValue ?? null)}
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function TickerProgressBars({
  items,
}: {
  items: TickerProgressDatum[]
}) {
  const valid = items.filter((item) => item.value !== null)

  if (valid.length === 0) {
    return (
      <EmptyState
        description="Breakdown data will appear here when analyst coverage is available."
        title="No distribution data"
      />
    )
  }

  const maxValue = valid.reduce((max, item) => Math.max(max, item.value ?? 0), 0)
  const denominator = maxValue === 0 ? 1 : maxValue

  return (
    <div className="space-y-3">
      {items.map((item, index) => {
        const value = item.value ?? 0
        const width = `${String((value / denominator) * 100)}%`

        return (
          <div key={`${item.label}:${String(index)}`} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span>{item.label}</span>
              <span className={cn("text-muted-foreground", getToneClass(item.tone))}>
                {formatNumber(item.value, { digits: 0 })}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-none bg-muted/70">
              <div
                className={cn("h-full rounded-none", getBarClass(item.value))}
                style={{ width }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function TickerDividendTable({
  currency,
  rows,
}: {
  currency?: string | null
  rows: {
    eventDate: string
    paymentDate?: string | null
    recordDate?: string | null
    value?: string | null
    yield?: number | null
  }[]
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        description="Dividend events will appear here when the calendar feed returns history."
        title="No dividend history"
      />
    )
  }

  return (
    <div className="market-table-frame">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border/50 bg-background/80 text-left">
            <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
              Ex-Dividend
            </th>
            <th className="px-3 py-2 font-departureMono text-xs tracking-tight text-muted-foreground">
              Amount
            </th>
            <th className="px-3 py-2 font-departureMono text-xs tracking-tight text-muted-foreground">
              Record
            </th>
            <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
              Payment
            </th>
            <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
              Yield
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr
              key={`${row.eventDate}:${String(index)}`}
              className="border-b border-border/35 last:border-b-0"
            >
              <td className="px-3 py-2">{formatDate(row.eventDate)}</td>
              <td className="px-3 py-2">
                {getNumericString(row.value ?? null, currency)}
              </td>
              <td className="px-3 py-2">{formatDate(row.recordDate)}</td>
              <td className="px-3 py-2 text-right">
                {formatDate(row.paymentDate)}
              </td>
              <td className="px-3 py-2 text-right">
                {formatPercent(row.yield)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
