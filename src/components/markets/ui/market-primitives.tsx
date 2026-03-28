import { Lock } from "lucide-react"
import Link from "next/link"

import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatMetricValue,
  formatPercent,
  formatSignedNumber,
} from "@/lib/markets-format"
import type {
  CalendarEvent,
  LockedMarketSection,
  MetricStat,
  NewsStory,
  PricePoint,
  QuoteSnapshot,
  StatementTable,
} from "@/lib/shared"
import { cn } from "@/lib/utils"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string
  title: string
  description: string
  actions?: React.ReactNode
}) {
  return (
    <header className="border-b border-border/70 px-4 py-5 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="font-departureMono text-[11px] tracking-[0.28em] text-muted-foreground uppercase">
            {eyebrow}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl tracking-tight sm:text-3xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        {actions ? <div className="shrink-0">{actions}</div> : null}
      </div>
    </header>
  )
}

export function SectionFrame({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string
  description?: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("border-t border-border/70", className)}>
      <div className="flex flex-col gap-4 px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-departureMono text-sm tracking-tight">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {aside ? (
            <div className="text-xs text-muted-foreground">{aside}</div>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  )
}

export function WarningStrip({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null
  }

  return (
    <div className="border-b border-[color:var(--vesper-orange)]/30 bg-[color:var(--vesper-orange)]/8 px-4 py-2 text-xs leading-5 text-foreground/80 sm:px-6">
      {warnings.join(" ")}
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
      <div className="font-medium text-foreground">{title}</div>
      <p className="mt-1 max-w-2xl leading-6">{description}</p>
    </div>
  )
}

export function QuoteStrip({
  quotes,
  hrefBase = "/stocks",
  linkItems = true,
}: {
  quotes: QuoteSnapshot[]
  hrefBase?: string
  linkItems?: boolean
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
    <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2 xl:grid-cols-4">
      {quotes.map((quote) => {
        const positive = (quote.change ?? 0) >= 0
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
            <div className="mt-4 flex items-end justify-between gap-3">
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
            className="bg-background px-4 py-3 transition-colors hover:bg-muted/40"
            href={`${hrefBase}/${encodeURIComponent(quote.symbol)}`}
          >
            {content}
          </Link>
        ) : (
          <div key={quote.symbol} className="bg-background px-4 py-3">
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
    <div className="space-y-2">
      {quotes.map((quote) => (
        <div
          key={quote.symbol}
          className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 border border-border/70 px-3 py-2"
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
    <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2 xl:grid-cols-4">
      {sectors.map((sector) => (
        <div key={sector.sector} className="bg-background px-4 py-3">
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

export function CalendarList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No scheduled events"
        description="Upcoming earnings, dividends, and releases will appear here when available."
      />
    )
  }

  return (
    <div className="space-y-2">
      {events.map((event) => (
        <div
          key={`${event.eventType}:${event.symbol}:${event.eventDate}:${event.value ?? ""}`}
          className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border border-border/70 px-3 py-2"
        >
          <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            {event.eventType}
          </div>
          <div className="min-w-0">
            <div className="text-sm">
              {event.symbol}{" "}
              <span className="text-muted-foreground">{event.name}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {event.value ?? event.estimate ?? "Scheduled"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(event.eventDate)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function NewsList({ stories }: { stories: NewsStory[] }) {
  if (stories.length === 0) {
    return (
      <EmptyState
        title="No market news"
        description="News will appear once the latest stock feed is available."
      />
    )
  }

  return (
    <div className="space-y-2">
      {stories.map((story) => (
        <a
          key={story.id}
          className="block border border-border/70 px-4 py-3 transition-colors hover:bg-muted/35"
          href={story.url}
          rel="noreferrer noopener"
          target="_blank"
        >
          <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            <span>{story.site ?? "Market feed"}</span>
            <span>{story.symbol ?? "Macro"}</span>
            <span>{formatDateTime(story.publishedAt)}</span>
          </div>
          <div className="mt-2 text-sm leading-6">{story.title}</div>
          {story.text ? (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
              {story.text}
            </p>
          ) : null}
        </a>
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
    <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2 xl:grid-cols-5">
      {metrics.map((metric) => (
        <div key={metric.label} className="bg-background px-4 py-3">
          <div className="text-xs text-muted-foreground">{metric.label}</div>
          <div className="mt-3 text-lg tracking-tight">
            {formatMetricValue(metric.value)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatementTables({ tables }: { tables: StatementTable[] }) {
  if (tables.length === 0) {
    return (
      <EmptyState
        title="No statement data"
        description="Income statement, balance sheet, and cash flow tables will appear here."
      />
    )
  }

  return (
    <div className="space-y-4">
      {tables.map((table) => (
        <div
          key={table.title}
          className="overflow-x-auto border border-border/70"
        >
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/70 bg-muted/30 text-left">
                <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                  {table.title}
                </th>
                {table.columns.map((column) => (
                  <th
                    key={`${table.title}:${column}`}
                    className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row) => (
                <tr
                  key={`${table.title}:${row.label}`}
                  className="border-b border-border/40 last:border-b-0"
                >
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.label}
                  </td>
                  {row.values.map((value, index) => (
                    <td
                      key={[row.label, String(index)].join(":")}
                      className="px-3 py-2 text-right"
                    >
                      {formatMetricValue(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
    <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => (
        <div key={section.title} className="bg-background px-4 py-4">
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
    <div className="grid gap-px border border-border/70 bg-border/70 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="bg-background px-4 py-4 sm:px-6">
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
      <div className="grid gap-px bg-border/70">
        <div className="bg-background px-4 py-3">
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
        <div className="bg-background px-4 py-3">
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
  const series = points.flatMap((point) =>
    typeof point.close === "number" && Number.isFinite(point.close)
      ? [{ date: point.date, close: point.close }]
      : []
  )

  if (series.length < 2) {
    return (
      <EmptyState
        title="No price history"
        description="Historical price data will appear here when the EOD series is available."
      />
    )
  }

  const closes = series.map((point) => point.close)
  const low = Math.min(...closes)
  const high = Math.max(...closes)
  const range = high - low || 1
  const firstPoint = series[0]
  const lastPoint = series[series.length - 1]

  if (!firstPoint || !lastPoint) {
    return (
      <EmptyState
        title="No price history"
        description="Historical price data will appear here when the EOD series is available."
      />
    )
  }

  const absoluteChange = lastPoint.close - firstPoint.close
  const percentChange =
    firstPoint.close !== 0
      ? ((lastPoint.close - firstPoint.close) / firstPoint.close) * 100
      : null
  const positive = absoluteChange >= 0
  const gradientId = `price-line-fill-${symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`
  const linePath = series
    .map((point, index) => {
      const x = (index / (series.length - 1)) * 100
      const y = 52 - ((point.close - low) / range) * 44
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
  const areaPath = `${linePath} L 100 56 L 0 56 Z`

  return (
    <div className="grid gap-px border border-border/70 bg-border/70 xl:grid-cols-[18rem_minmax(0,1fr)]">
      <div className="grid gap-px bg-border/70">
        <div className="bg-background px-4 py-4">
          <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
            Price action
          </div>
          <div className="mt-2 text-xs leading-5 text-muted-foreground">
            {historicalRangeLabel} of end-of-day closes for {symbol}, rendered
            from the cached FMP series.
          </div>
        </div>
        <div className="bg-background px-4 py-3">
          <div className="text-xs text-muted-foreground">Last close</div>
          <div className="mt-2 text-lg tracking-tight">
            {formatCurrency(lastPoint.close, { currency: currency ?? "USD" })}
          </div>
        </div>
        <div className="bg-background px-4 py-3">
          <div className="text-xs text-muted-foreground">Period change</div>
          <div
            className={cn(
              "mt-2 font-departureMono text-sm",
              positive
                ? "text-[color:var(--vesper-teal)]"
                : "text-[color:var(--vesper-orange)]"
            )}
          >
            {formatSignedNumber(absoluteChange)} / {formatPercent(percentChange)}
          </div>
        </div>
        <div className="grid gap-px bg-border/70 sm:grid-cols-2 xl:grid-cols-1">
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Range low</div>
            <div className="mt-2 text-sm">
              {formatCurrency(low, { currency: currency ?? "USD" })}
            </div>
          </div>
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Range high</div>
            <div className="mt-2 text-sm">
              {formatCurrency(high, { currency: currency ?? "USD" })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
            Line chart
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(firstPoint.date)} to {formatDate(lastPoint.date)}
          </div>
        </div>

        <div className="mt-4 border border-border/70 bg-muted/20 px-3 py-3">
          <svg
            aria-hidden
            className="h-52 w-full"
            viewBox="0 0 100 56"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={
                    positive ? "var(--vesper-teal)" : "var(--vesper-orange)"
                  }
                  stopOpacity="0.2"
                />
                <stop
                  offset="100%"
                  stopColor={
                    positive ? "var(--vesper-teal)" : "var(--vesper-orange)"
                  }
                  stopOpacity="0"
                />
              </linearGradient>
            </defs>

            {[12, 24, 36, 48].map((y) => (
              <line
                key={y}
                x1="0"
                x2="100"
                y1={String(y)}
                y2={String(y)}
                stroke="color-mix(in oklab, var(--border) 80%, transparent)"
                strokeDasharray="1.5 2.5"
                strokeWidth="0.5"
                vectorEffect="non-scaling-stroke"
              />
            ))}

            <path d={areaPath} fill={`url(#${gradientId})`} />
            <path
              d={linePath}
              fill="none"
              stroke={positive ? "var(--vesper-teal)" : "var(--vesper-orange)"}
              strokeLinecap="square"
              strokeLinejoin="miter"
              strokeWidth="1.8"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx="100"
              cy={(56 - ((lastPoint.close - low) / range) * 44).toFixed(2)}
              r="1.7"
              fill={positive ? "var(--vesper-teal)" : "var(--vesper-orange)"}
            />
          </svg>
        </div>

        <div className="mt-3 grid gap-px border border-border/70 bg-border/70 sm:grid-cols-3">
          <div className="bg-background px-3 py-2">
            <div className="text-[11px] text-muted-foreground">Start</div>
            <div className="mt-1 text-xs">{formatDate(firstPoint.date)}</div>
          </div>
          <div className="bg-background px-3 py-2">
            <div className="text-[11px] text-muted-foreground">Last</div>
            <div className="mt-1 text-xs">{formatDate(lastPoint.date)}</div>
          </div>
          <div className="bg-background px-3 py-2">
            <div className="text-[11px] text-muted-foreground">Points</div>
            <div className="mt-1 text-xs">{series.length} closes</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export function FilingList({
  items,
}: {
  items: {
    formType: string | null
    filingDate: string | null
    description: string | null
    finalLink: string | null
  }[]
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No SEC filings"
        description="Recent filings will appear here when the SEC feed returns data."
      />
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <a
          key={
            item.finalLink ??
            [item.formType ?? "form", item.filingDate ?? "date", String(index)].join(
              ":"
            )
          }
          className="flex items-center justify-between gap-3 border border-border/70 px-4 py-3 transition-colors hover:bg-muted/35"
          href={item.finalLink ?? "#"}
          rel="noreferrer noopener"
          target="_blank"
        >
          <div>
            <div className="font-departureMono text-xs tracking-tight">
              {item.formType ?? "Filing"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item.description ?? "SEC filing"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(item.filingDate)}
          </div>
        </a>
      ))}
    </div>
  )
}
