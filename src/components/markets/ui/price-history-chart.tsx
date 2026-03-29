"use client"

import { useState } from "react"

import {
  formatCurrency,
  formatPercent,
  formatSignedNumber,
} from "@/lib/markets-format"
import type { PricePoint } from "@/lib/shared/markets/core"
import { cn } from "@/lib/utils"

type ChartTimeframeId = "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "MAX"

interface ChartSeriesPoint {
  date: string
  close: number
  timestamp: number
}

const MAX_TIMEFRAME = {
  id: "MAX",
  label: "MAX",
  longLabel: "max range",
} as const

const TIMEFRAME_OPTIONS: {
  id: ChartTimeframeId
  label: string
  longLabel: string
}[] = [
  { id: "1M", label: "1M", longLabel: "1 month" },
  { id: "3M", label: "3M", longLabel: "3 months" },
  { id: "6M", label: "6M", longLabel: "6 months" },
  { id: "YTD", label: "YTD", longLabel: "year to date" },
  { id: "1Y", label: "1Y", longLabel: "1 year" },
  { id: "3Y", label: "3Y", longLabel: "3 years" },
  MAX_TIMEFRAME,
] as const

const chartDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
})

function getFullRangeLabel(historicalRangeLabel: string) {
  const normalized = historicalRangeLabel.trim()
  const yearsMatch = /^(\d+)(\+)?\s+years$/i.exec(normalized)

  if (yearsMatch) {
    const years = yearsMatch[1]

    if (!years) {
      return "MAX"
    }

    return yearsMatch[2] ? `${years}Y+` : `${years}Y`
  }

  return "MAX"
}

function shiftUtcDate(
  date: Date,
  offsets: { months?: number; years?: number }
): Date {
  return new Date(
    Date.UTC(
      date.getUTCFullYear() + (offsets.years ?? 0),
      date.getUTCMonth() + (offsets.months ?? 0),
      date.getUTCDate()
    )
  )
}

function getTimeframeStart(
  lastTimestamp: number,
  timeframe: ChartTimeframeId
): number | null {
  if (timeframe === "MAX") {
    return null
  }

  const lastDate = new Date(lastTimestamp)

  switch (timeframe) {
    case "1M":
      return shiftUtcDate(lastDate, { months: -1 }).getTime()
    case "3M":
      return shiftUtcDate(lastDate, { months: -3 }).getTime()
    case "6M":
      return shiftUtcDate(lastDate, { months: -6 }).getTime()
    case "YTD":
      return Date.UTC(lastDate.getUTCFullYear(), 0, 1)
    case "1Y":
      return shiftUtcDate(lastDate, { years: -1 }).getTime()
    case "3Y":
      return shiftUtcDate(lastDate, { years: -3 }).getTime()
  }
}

function filterSeriesByTimeframe(
  series: ChartSeriesPoint[],
  timeframe: ChartTimeframeId
): ChartSeriesPoint[] {
  if (timeframe === "MAX") {
    return series
  }

  const lastPoint = series[series.length - 1]

  if (!lastPoint) {
    return series
  }

  const startTimestamp = getTimeframeStart(lastPoint.timestamp, timeframe)

  if (startTimestamp === null) {
    return series
  }

  return series.filter((point) => point.timestamp >= startTimestamp)
}

function sampleSeries(
  series: ChartSeriesPoint[],
  maxPoints: number
): ChartSeriesPoint[] {
  if (series.length <= maxPoints) {
    return series
  }

  const sampled: ChartSeriesPoint[] = []
  const seenIndexes = new Set<number>()

  for (let position = 0; position < maxPoints; position += 1) {
    const index = Math.round((position / (maxPoints - 1)) * (series.length - 1))

    if (seenIndexes.has(index)) {
      continue
    }

    const point = series[index]

    if (!point) {
      continue
    }

    seenIndexes.add(index)
    sampled.push(point)
  }

  return sampled
}

function buildSeries(points: PricePoint[]): ChartSeriesPoint[] {
  return points
    .flatMap((point) => {
      if (
        typeof point.close !== "number" ||
        !Number.isFinite(point.close) ||
        !point.date
      ) {
        return []
      }

      const timestamp = Date.parse(point.date)

      if (Number.isNaN(timestamp)) {
        return []
      }

      return [{ date: point.date, close: point.close, timestamp }]
    })
    .sort((left, right) => left.timestamp - right.timestamp)
}

function buildDateMarkers(series: ChartSeriesPoint[]): ChartSeriesPoint[] {
  const indexes = [
    0,
    Math.floor((series.length - 1) / 2),
    series.length - 1,
  ].filter((index, position, values) => values.indexOf(index) === position)

  return indexes
    .map((index) => series[index])
    .filter((point): point is ChartSeriesPoint => point !== undefined)
}

function formatChartDate(value: string) {
  const parsed = new Date(`${value}T00:00:00Z`)

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return chartDateFormatter.format(parsed)
}

function getDefaultTimeframe(availableTimeframes: ChartTimeframeId[]) {
  const preferredOrder: ChartTimeframeId[] = ["1Y", "6M", "3M", "MAX"]

  for (const timeframe of preferredOrder) {
    if (availableTimeframes.includes(timeframe)) {
      return timeframe
    }
  }

  return availableTimeframes[availableTimeframes.length - 1] ?? "MAX"
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
  const series = buildSeries(points)
  const timeframeOptions = TIMEFRAME_OPTIONS.map((option) =>
    option.id === "MAX"
      ? {
          ...option,
          label: getFullRangeLabel(historicalRangeLabel),
          longLabel: historicalRangeLabel.toLowerCase(),
        }
      : option
  )

  const availableTimeframes = timeframeOptions
    .filter((option) => {
      if (option.id === "MAX") {
        return true
      }

      return filterSeriesByTimeframe(series, option.id).length >= 2
    })
    .map((option) => option.id)

  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframeId>(
    () => getDefaultTimeframe(availableTimeframes)
  )
  const resolvedTimeframe = availableTimeframes.includes(selectedTimeframe)
    ? selectedTimeframe
    : getDefaultTimeframe(availableTimeframes)

  if (series.length < 2) {
    return (
      <div className="border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">No price history</div>
        <p className="mt-1 max-w-2xl leading-6">
          Historical price data will appear here when the EOD series is
          available.
        </p>
      </div>
    )
  }

  const activeTimeframe = timeframeOptions.find(
    (option) => option.id === resolvedTimeframe
  ) ?? {
    ...MAX_TIMEFRAME,
    label: getFullRangeLabel(historicalRangeLabel),
    longLabel: historicalRangeLabel.toLowerCase(),
  }
  const filteredSeries = filterSeriesByTimeframe(series, activeTimeframe.id)
  const visibleSeries = filteredSeries.length >= 2 ? filteredSeries : series
  const renderSeries = sampleSeries(visibleSeries, 240)
  const closes = visibleSeries.map((point) => point.close)
  const low = Math.min(...closes)
  const high = Math.max(...closes)
  const range = high - low || 1
  const firstPoint = visibleSeries[0]
  const lastPoint = visibleSeries[visibleSeries.length - 1]

  if (!firstPoint || !lastPoint || renderSeries.length < 2) {
    return (
      <div className="border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">No price history</div>
        <p className="mt-1 max-w-2xl leading-6">
          Historical price data will appear here when the EOD series is
          available.
        </p>
      </div>
    )
  }

  const absoluteChange = lastPoint.close - firstPoint.close
  const percentChange =
    firstPoint.close !== 0
      ? ((lastPoint.close - firstPoint.close) / firstPoint.close) * 100
      : null
  const positive = absoluteChange >= 0
  const accentColor = positive ? "var(--vesper-teal)" : "var(--vesper-orange)"
  const linePath = renderSeries
    .map((point, index) => {
      const x = (index / (renderSeries.length - 1)) * 100
      const y = 50 - ((point.close - low) / range) * 38
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`
    })
    .join(" ")
  const dateMarkers = buildDateMarkers(visibleSeries)
  const valueMarkers = [high, low + range / 2, low]

  return (
    <div className="market-split-17 grid gap-px border border-border/70 bg-border/70">
      <div className="relative overflow-hidden bg-background">
        <div className="relative grid gap-px bg-border/70">
          <div className="bg-background px-4 py-4">
            <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
              Price action
            </div>
            <div className="mt-2 text-xs leading-5 text-muted-foreground">
              {activeTimeframe.longLabel} view inside{" "}
              {historicalRangeLabel.toLowerCase()} of cached FMP closes for{" "}
              {symbol}.
            </div>
          </div>

          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Last close</div>
            <div className="mt-2 text-lg tracking-tight">
              {formatCurrency(lastPoint.close, { currency: currency ?? "USD" })}
            </div>
          </div>

          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Window move</div>
            <div
              className={cn(
                "mt-2 font-departureMono text-sm",
                positive
                  ? "text-[color:var(--vesper-teal)]"
                  : "text-[color:var(--vesper-orange)]"
              )}
            >
              {formatSignedNumber(absoluteChange)} /{" "}
              {formatPercent(percentChange)}
            </div>
          </div>

          <div className="grid gap-px bg-border/70 sm:grid-cols-2 xl:grid-cols-1">
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">Window start</div>
              <div className="mt-2 text-sm">
                {formatChartDate(firstPoint.date)}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Visible closes
              </div>
              <div className="mt-2 text-sm">{visibleSeries.length}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
              Market window
            </div>
            <div className="text-sm leading-6 text-muted-foreground">
              {formatChartDate(firstPoint.date)} to{" "}
              {formatChartDate(lastPoint.date)}
            </div>
          </div>

          <div
            className="inline-flex flex-wrap gap-px self-start border border-border/70 bg-border/70"
            role="toolbar"
            aria-label="Price history timeframe"
          >
            {timeframeOptions
              .filter((option) => availableTimeframes.includes(option.id))
              .map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={resolvedTimeframe === option.id}
                  className={cn(
                    "min-w-11 bg-background px-3 py-2 font-departureMono text-[11px] tracking-[0.18em] uppercase transition-colors",
                    resolvedTimeframe === option.id
                      ? positive
                        ? "bg-[color:var(--vesper-teal)]/12 text-[color:var(--vesper-teal)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--vesper-teal)_55%,transparent)]"
                        : "bg-[color:var(--vesper-orange)]/12 text-[color:var(--vesper-orange)] shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--vesper-orange)_55%,transparent)]"
                      : "text-muted-foreground hover:bg-muted/45 hover:text-foreground"
                  )}
                  onClick={() => {
                    setSelectedTimeframe(option.id)
                  }}
                >
                  {option.label}
                </button>
              ))}
          </div>
        </div>

        <div className="relative mt-5 border border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--muted)_32%,transparent)_0%,transparent_18%,transparent_100%)] px-3 py-3 sm:px-4">
          <div className="relative border border-border/40 bg-background/80 pr-12">
            <svg
              aria-hidden
              className="h-60 w-full"
              viewBox="0 0 100 56"
              preserveAspectRatio="none"
            >
              {[10, 20, 30, 40, 50].map((y) => (
                <line
                  key={y}
                  x1="0"
                  x2="100"
                  y1={String(y)}
                  y2={String(y)}
                  stroke="color-mix(in oklab, var(--border) 82%, transparent)"
                  strokeDasharray="1.5 2.5"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {[20, 40, 60, 80].map((x) => (
                <line
                  key={x}
                  x1={String(x)}
                  x2={String(x)}
                  y1="0"
                  y2="56"
                  stroke="color-mix(in oklab, var(--border) 70%, transparent)"
                  strokeDasharray="1.5 3"
                  strokeWidth="0.4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              <path
                d={linePath}
                fill="none"
                stroke={accentColor}
                strokeLinecap="square"
                strokeLinejoin="miter"
                strokeWidth="1.7"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>

          <div className="pointer-events-none absolute inset-y-3 right-3 flex flex-col justify-between text-[11px] text-muted-foreground">
            {valueMarkers.map((value, index) => (
              <div key={index}>
                {formatCurrency(value, { currency: currency ?? "USD" })}
              </div>
            ))}
          </div>
        </div>

        <div className="market-grid-4 mt-4 grid gap-px border border-border/70 bg-border/70">
          {dateMarkers.map((marker, index) => (
            <div
              key={[marker.date, String(index)].join(":")}
              className="bg-background px-3 py-2"
            >
              <div className="text-[11px] text-muted-foreground">
                {index === 0
                  ? "Start"
                  : index === dateMarkers.length - 1
                    ? "Last"
                    : "Midpoint"}
              </div>
              <div className="mt-1 text-xs">{formatChartDate(marker.date)}</div>
            </div>
          ))}
          <div className="bg-background px-3 py-2">
            <div className="text-[11px] text-muted-foreground">
              Available range
            </div>
            <div className="mt-1 text-xs">{historicalRangeLabel}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
