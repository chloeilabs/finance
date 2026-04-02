"use client"

import { useId, useState } from "react"

import {
  formatCurrency,
  formatPercent,
  formatSignedNumber,
} from "@/lib/markets-format"
import type { PricePoint } from "@/lib/shared/markets/core"
import { cn } from "@/lib/utils"

type ChartTimeframeId = "1D" | "1M" | "3M" | "6M" | "YTD" | "1Y" | "3Y" | "MAX"

interface ChartSeriesPoint {
  date: string
  close: number
  timestamp: number
}

interface ChartCoordinate extends ChartSeriesPoint {
  x: number
  y: number
}

interface ChartAxisTick {
  label: string
}

interface ChartTimeAxisTick extends ChartAxisTick {
  detail: string
  x: number
}

interface ChartPriceAxisTick extends ChartAxisTick {
  y: number
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
  { id: "1D", label: "1D", longLabel: "1 day" },
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
const chartAxisDateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const chartAxisDateDetailFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  timeZone: "UTC",
})
const chartTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})
const chartAxisTimeDetailFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const chartDateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
})
const CHART_VIEWBOX_WIDTH = 100
const CHART_VIEWBOX_HEIGHT = 56
const CHART_PADDING_X = 2.5
const CHART_TOP_Y = 4
const CHART_BOTTOM_Y = 52

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

  return null
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

function parseChartTimestamp(value: string) {
  const normalized = value.includes("T")
    ? value
    : value.includes(" ")
      ? value.replace(" ", "T")
      : `${value}T00:00:00Z`

  return Date.parse(normalized)
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

      const timestamp = parseChartTimestamp(point.date)

      if (Number.isNaN(timestamp)) {
        return []
      }

      return [{ date: point.date, close: point.close, timestamp }]
    })
    .sort((left, right) => left.timestamp - right.timestamp)
}

function buildTickIndexes(length: number, count: number) {
  return Array.from({ length: Math.min(count, length) }, (_, position) =>
    Math.round((position / (Math.min(count, length) - 1 || 1)) * (length - 1))
  ).filter((index, position, values) => values.indexOf(index) === position)
}

function buildTimeAxisTicks(
  series: ChartSeriesPoint[],
  options: { intraday: boolean }
): ChartTimeAxisTick[] {
  const indexes = buildTickIndexes(series.length, 8)

  return indexes
    .map((index) => {
      const point = series[index]

      if (!point) {
        return null
      }

      const parsed = new Date(point.timestamp)

      return {
        detail: options.intraday
          ? chartAxisTimeDetailFormatter.format(parsed)
          : chartAxisDateDetailFormatter.format(parsed),
        label: options.intraday
          ? chartTimeFormatter.format(parsed)
          : chartAxisDateLabelFormatter.format(parsed),
        x:
          CHART_PADDING_X +
          (index / (series.length - 1)) *
            (CHART_VIEWBOX_WIDTH - CHART_PADDING_X * 2),
      }
    })
    .filter((tick): tick is ChartTimeAxisTick => tick !== null)
}

function buildPriceAxisTicks(
  low: number,
  high: number,
  options: { currency: string }
): ChartPriceAxisTick[] {
  const values =
    high === low
      ? [high]
      : Array.from({ length: 8 }, (_, position) => {
          const ratio = position / 7
          return Number((high - (high - low) * ratio).toFixed(2))
        })
  const range = high - low || 1

  return values.map((value) => ({
    label: formatCurrency(value, { currency: options.currency }),
    y: getChartY(value, low, range),
  }))
}

function formatChartDate(
  value: string,
  options: { intraday?: boolean; includeDate?: boolean } = {}
) {
  const parsed = new Date(parseChartTimestamp(value))

  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  if (!options.intraday) {
    return chartDateFormatter.format(parsed)
  }

  return options.includeDate
    ? chartDateTimeFormatter.format(parsed)
    : chartTimeFormatter.format(parsed)
}

function formatSignedCurrency(
  value: number | null | undefined,
  options: { currency?: string } = {}
) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A"
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: options.currency ?? "USD",
    signDisplay: "exceptZero",
    maximumFractionDigits: 2,
  }).format(value)
}

function formatElapsedSpan(
  startTimestamp: number,
  endTimestamp: number,
  options: { intraday: boolean }
) {
  function formatUnit(
    value: number,
    labels: { singular: string; plural: string }
  ) {
    const rounded = Math.round(value * 10) / 10
    const display = Number.isInteger(rounded)
      ? String(rounded)
      : rounded.toFixed(1)

    return `${display} ${rounded === 1 ? labels.singular : labels.plural}`
  }

  const diffMs = Math.max(0, endTimestamp - startTimestamp)

  if (options.intraday) {
    const totalMinutes = Math.max(1, Math.round(diffMs / 60_000))
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60

    if (hours > 0 && minutes > 0) {
      return `${String(hours)}h ${String(minutes)}m`
    }

    if (hours > 0) {
      return `${String(hours)}h`
    }

    return `${String(totalMinutes)}m`
  }

  const totalDays = Math.max(1, Math.round(diffMs / 86_400_000))

  if (totalDays >= 365) {
    return formatUnit(totalDays / 365, {
      singular: "year",
      plural: "years",
    })
  }

  if (totalDays >= 30) {
    return formatUnit(totalDays / 30, {
      singular: "month",
      plural: "months",
    })
  }

  return `${String(totalDays)} days`
}

function calculateAnnualizedReturn(
  startValue: number,
  endValue: number,
  startTimestamp: number,
  endTimestamp: number
) {
  if (startValue <= 0 || endValue <= 0 || endTimestamp <= startTimestamp) {
    return null
  }

  const elapsedYears = (endTimestamp - startTimestamp) / (86_400_000 * 365)

  if (elapsedYears <= 1) {
    return null
  }

  return (Math.pow(endValue / startValue, 1 / elapsedYears) - 1) * 100
}

function getDefaultTimeframe(availableTimeframes: ChartTimeframeId[]) {
  const preferredOrder: ChartTimeframeId[] = ["1Y", "6M", "3M", "1D", "MAX"]

  for (const timeframe of preferredOrder) {
    if (availableTimeframes.includes(timeframe)) {
      return timeframe
    }
  }

  return availableTimeframes[availableTimeframes.length - 1] ?? "MAX"
}

function getChartY(value: number, low: number, range: number) {
  return (
    CHART_BOTTOM_Y - ((value - low) / range) * (CHART_BOTTOM_Y - CHART_TOP_Y)
  )
}

function buildChartCoordinates(
  series: ChartSeriesPoint[],
  params: { low: number; range: number }
): ChartCoordinate[] {
  return series.map((point, index) => ({
    ...point,
    x:
      CHART_PADDING_X +
      (index / (series.length - 1)) *
        (CHART_VIEWBOX_WIDTH - CHART_PADDING_X * 2),
    y: getChartY(point.close, params.low, params.range),
  }))
}

function buildSmoothPath(coordinates: ChartCoordinate[]): string {
  if (coordinates.length === 0) {
    return ""
  }

  if (coordinates.length === 1) {
    const point = coordinates[0]

    return point ? `M ${point.x.toFixed(2)} ${point.y.toFixed(2)}` : ""
  }

  const [firstPoint, ...rest] = coordinates

  if (!firstPoint) {
    return ""
  }

  let path = `M ${firstPoint.x.toFixed(2)} ${firstPoint.y.toFixed(2)}`

  rest.forEach((point, index) => {
    const previous = coordinates[index]

    if (!previous) {
      return
    }

    const controlX = (previous.x + point.x) / 2

    path += [
      " C",
      ` ${controlX.toFixed(2)} ${previous.y.toFixed(2)}`,
      ` ${controlX.toFixed(2)} ${point.y.toFixed(2)}`,
      ` ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    ].join("")
  })

  return path
}

function buildAreaPath(coordinates: ChartCoordinate[]): string {
  const linePath = buildSmoothPath(coordinates)
  const firstPoint = coordinates[0]
  const lastPoint = coordinates[coordinates.length - 1]

  if (!linePath || !firstPoint || !lastPoint) {
    return ""
  }

  return [
    linePath,
    `L ${lastPoint.x.toFixed(2)} ${CHART_BOTTOM_Y.toFixed(2)}`,
    `L ${firstPoint.x.toFixed(2)} ${CHART_BOTTOM_Y.toFixed(2)}`,
    "Z",
  ].join(" ")
}

export function PriceHistoryChart({
  symbol,
  points,
  intradayPoints = [],
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
  const eodSeries = buildSeries(points)
  const intradaySeries = buildSeries(intradayPoints)
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
      if (option.id === "1D") {
        return intradaySeries.length >= 2
      }

      if (option.id === "MAX") {
        return eodSeries.length >= 2
      }

      return filterSeriesByTimeframe(eodSeries, option.id).length >= 2
    })
    .map((option) => option.id)

  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframeId>(
    () => getDefaultTimeframe(availableTimeframes)
  )
  const gradientId = useId().replace(/:/g, "")
  const resolvedTimeframe = availableTimeframes.includes(selectedTimeframe)
    ? selectedTimeframe
    : getDefaultTimeframe(availableTimeframes)

  if (eodSeries.length < 2 && intradaySeries.length < 2) {
    return (
      <div className="market-soft-surface px-4 py-8 text-sm text-muted-foreground">
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
  const isIntradayView = activeTimeframe.id === "1D"
  const baseSeries = isIntradayView ? intradaySeries : eodSeries
  const filteredSeries = isIntradayView
    ? intradaySeries
    : filterSeriesByTimeframe(eodSeries, activeTimeframe.id)
  const visibleSeries = filteredSeries.length >= 2 ? filteredSeries : baseSeries
  const renderSeries = sampleSeries(visibleSeries, 240)
  const closes = visibleSeries.map((point) => point.close)
  const low = Math.min(...closes)
  const high = Math.max(...closes)
  const range = high - low || 1
  const firstPoint = visibleSeries[0]
  const lastPoint = visibleSeries[visibleSeries.length - 1]

  if (!firstPoint || !lastPoint || renderSeries.length < 2) {
    return (
      <div className="market-soft-surface px-4 py-8 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">No price history</div>
        <p className="mt-1 max-w-2xl leading-6">
          Historical price data will appear here when the EOD series is
          available.
        </p>
      </div>
    )
  }

  const derivedAbsoluteChange = lastPoint.close - firstPoint.close
  const derivedPercentChange =
    firstPoint.close !== 0
      ? ((lastPoint.close - firstPoint.close) / firstPoint.close) * 100
      : null
  const absoluteChange =
    isIntradayView && sessionChange !== null && sessionChange !== undefined
      ? sessionChange
      : derivedAbsoluteChange
  const percentChange =
    isIntradayView &&
    sessionChangePercent !== null &&
    sessionChangePercent !== undefined
      ? sessionChangePercent
      : derivedPercentChange
  const positive =
    isIntradayView && sessionChange !== null && sessionChange !== undefined
      ? sessionChange >= 0
      : absoluteChange >= 0
  const accentColor = positive ? "var(--vesper-teal)" : "var(--vesper-orange)"
  const chartCoordinates = buildChartCoordinates(renderSeries, { low, range })
  const linePath = buildSmoothPath(chartCoordinates)
  const areaPath = buildAreaPath(chartCoordinates)
  const lastCoordinate = chartCoordinates[chartCoordinates.length - 1]
  const displayedLastValue =
    isIntradayView && currentPrice !== null && currentPrice !== undefined
      ? currentPrice
      : lastPoint.close
  const rangeLabel = `${formatCurrency(low, {
    currency: currency ?? "USD",
  })} to ${formatCurrency(high, {
    currency: currency ?? "USD",
  })}`
  const plotFrameStyle = {
    background:
      "linear-gradient(180deg, color-mix(in oklab, var(--background) 95%, transparent) 0%, color-mix(in oklab, var(--background) 90%, var(--muted)) 100%)",
    boxShadow:
      "inset 0 1px 0 color-mix(in oklab, var(--foreground) 6%, transparent)",
  }
  const timeAxisTicks = buildTimeAxisTicks(visibleSeries, {
    intraday: isIntradayView,
  })
  const priceAxisTicks = buildPriceAxisTicks(low, high, {
    currency: currency ?? "USD",
  })
  const elapsedSpanLabel = formatElapsedSpan(
    firstPoint.timestamp,
    lastPoint.timestamp,
    { intraday: isIntradayView }
  )
  const annualizedReturn = calculateAnnualizedReturn(
    firstPoint.close,
    lastPoint.close,
    firstPoint.timestamp,
    lastPoint.timestamp
  )
  const footerItems = [
    {
      label: isIntradayView ? "Open" : "Entry close",
      value: formatCurrency(firstPoint.close, {
        currency: currency ?? "USD",
      }),
    },
    {
      label: isIntradayView ? "Last trade" : "Latest close",
      value: formatCurrency(displayedLastValue, {
        currency: currency ?? "USD",
      }),
    },
    {
      label: isIntradayView ? "Net move" : "Gain / share",
      value: formatSignedCurrency(absoluteChange, {
        currency: currency ?? "USD",
      }),
      tone: positive
        ? "text-[color:var(--vesper-teal)]"
        : "text-[color:var(--vesper-orange)]",
    },
    {
      label: isIntradayView ? "Session return" : "Total return",
      value: formatPercent(percentChange),
      tone: positive
        ? "text-[color:var(--vesper-teal)]"
        : "text-[color:var(--vesper-orange)]",
    },
    {
      label:
        annualizedReturn !== null
          ? "Annualized"
          : isIntradayView
            ? "Session span"
            : "Holding period",
      value:
        annualizedReturn !== null
          ? formatPercent(annualizedReturn)
          : elapsedSpanLabel,
      tone:
        annualizedReturn !== null
          ? positive
            ? "text-[color:var(--vesper-teal)]"
            : "text-[color:var(--vesper-orange)]"
          : undefined,
    },
  ]
  const summaryItems = [
    {
      label: isIntradayView ? "Last trade" : "Last close",
      value: formatCurrency(displayedLastValue, {
        currency: currency ?? "USD",
      }),
    },
    {
      label: isIntradayView ? "Session move" : "Window move",
      value: `${formatSignedNumber(absoluteChange)} / ${formatPercent(percentChange)}`,
      tone: positive
        ? "text-[color:var(--vesper-teal)]"
        : "text-[color:var(--vesper-orange)]",
    },
    {
      label: isIntradayView ? "Session start" : "Window start",
      value: formatChartDate(firstPoint.date, {
        intraday: isIntradayView,
        includeDate: isIntradayView,
      }),
    },
    {
      label: isIntradayView ? "Visible bars" : "Visible closes",
      value: String(visibleSeries.length),
    },
  ]

  return (
    <div className="market-split-17 grid gap-4">
      <div className="market-soft-surface px-4 py-4 sm:px-5">
        <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
          Price action
        </div>
        <div className="mt-2 text-xs leading-5 text-muted-foreground">
          {isIntradayView
            ? `${activeTimeframe.longLabel} view using cached FMP intraday bars for ${symbol}.`
            : `${activeTimeframe.longLabel} view inside ${historicalRangeLabel.toLowerCase()} of cached FMP closes for ${symbol}.`}
        </div>

        <div className="mt-5 grid gap-y-3 border-t border-border/45 pt-4">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="grid gap-1 border-b border-border/35 pb-3 last:border-b-0 last:pb-0"
            >
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div
                className={cn(
                  "text-sm tracking-tight",
                  item.tone ? `font-departureMono ${item.tone}` : undefined
                )}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="market-soft-surface px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
              Market window
            </div>
            <div className="text-sm leading-6 text-muted-foreground">
              {formatChartDate(firstPoint.date, {
                intraday: isIntradayView,
                includeDate: isIntradayView,
              })}{" "}
              to{" "}
              {formatChartDate(lastPoint.date, {
                intraday: isIntradayView,
                includeDate: isIntradayView,
              })}
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="market-chip px-2.5 py-1 text-[11px] text-muted-foreground">
                {visibleSeries.length} {isIntradayView ? "bars" : "closes"}
              </div>
              <div className="market-chip px-2.5 py-1 text-[11px] text-muted-foreground">
                {rangeLabel}
              </div>
            </div>
          </div>

          <div
            className="inline-flex flex-wrap gap-1 self-start"
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
                    "market-chip min-w-11 px-3 py-2 font-departureMono text-[11px] tracking-[0.18em] uppercase transition-colors",
                    resolvedTimeframe === option.id
                      ? positive
                        ? "bg-[color:var(--vesper-teal)]/12 text-[color:var(--vesper-teal)]"
                        : "bg-[color:var(--vesper-orange)]/12 text-[color:var(--vesper-orange)]"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
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

        <div
          className="market-panel-tile relative mt-4 px-3 py-3 sm:px-4"
          style={plotFrameStyle}
        >
          <div className="relative overflow-hidden pr-4 pl-14">
            <svg
              aria-hidden
              className="relative h-60 w-full"
              viewBox={`${String(CHART_VIEWBOX_WIDTH)} ${String(CHART_VIEWBOX_HEIGHT)}`.replace(
                /^/,
                "0 0 "
              )}
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id={`${gradientId}-area`}
                  x1="0"
                  y1={String(CHART_TOP_Y)}
                  x2="0"
                  y2={String(CHART_BOTTOM_Y)}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.2" />
                  <stop
                    offset="55%"
                    stopColor={accentColor}
                    stopOpacity="0.08"
                  />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
                </linearGradient>
                <linearGradient
                  id={`${gradientId}-line`}
                  x1="0"
                  y1="0"
                  x2={String(CHART_VIEWBOX_WIDTH)}
                  y2="0"
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor={accentColor} stopOpacity="0.5" />
                  <stop
                    offset="45%"
                    stopColor={accentColor}
                    stopOpacity="0.92"
                  />
                  <stop offset="100%" stopColor={accentColor} stopOpacity="1" />
                </linearGradient>
                <filter
                  id={`${gradientId}-glow`}
                  x="-10%"
                  y="-20%"
                  width="120%"
                  height="140%"
                >
                  <feGaussianBlur result="blur" stdDeviation="1.5" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {priceAxisTicks.map((tick) => (
                <line
                  key={`${tick.label}:${tick.y.toFixed(2)}`}
                  x1={String(CHART_PADDING_X)}
                  x2={String(CHART_VIEWBOX_WIDTH - CHART_PADDING_X)}
                  y1={tick.y.toFixed(2)}
                  y2={tick.y.toFixed(2)}
                  stroke="color-mix(in oklab, var(--border) 68%, transparent)"
                  strokeDasharray="1.5 3.5"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              {timeAxisTicks.map((tick) => (
                <line
                  key={`${tick.label}:${tick.x.toFixed(2)}`}
                  x1={tick.x.toFixed(2)}
                  x2={tick.x.toFixed(2)}
                  y1={String(CHART_TOP_Y)}
                  y2={String(CHART_BOTTOM_Y)}
                  stroke="color-mix(in oklab, var(--border) 48%, transparent)"
                  strokeDasharray="1.5 4"
                  strokeWidth="0.4"
                  vectorEffect="non-scaling-stroke"
                />
              ))}

              <line
                x1={String(CHART_PADDING_X)}
                x2={String(CHART_VIEWBOX_WIDTH - CHART_PADDING_X)}
                y1={String(CHART_BOTTOM_Y)}
                y2={String(CHART_BOTTOM_Y)}
                stroke="color-mix(in oklab, var(--border) 82%, transparent)"
                strokeDasharray="2.2 4.4"
                strokeWidth="0.55"
                vectorEffect="non-scaling-stroke"
              />

              {lastCoordinate ? (
                <line
                  x1={String(CHART_PADDING_X)}
                  x2={String(CHART_VIEWBOX_WIDTH - CHART_PADDING_X)}
                  y1={lastCoordinate.y.toFixed(2)}
                  y2={lastCoordinate.y.toFixed(2)}
                  stroke={accentColor}
                  strokeDasharray="2 3"
                  strokeOpacity="0.28"
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}

              <path d={areaPath} fill={`url(#${gradientId}-area)`} />
              <path
                d={linePath}
                fill="none"
                filter={`url(#${gradientId}-glow)`}
                stroke={accentColor}
                strokeOpacity="0.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2.8"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d={linePath}
                fill="none"
                stroke={`url(#${gradientId}-line)`}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.9"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {lastCoordinate ? (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${((lastCoordinate.x / CHART_VIEWBOX_WIDTH) * 100).toFixed(2)}%`,
                  top: `${((lastCoordinate.y / CHART_VIEWBOX_HEIGHT) * 100).toFixed(2)}%`,
                }}
              >
                <div
                  className="flex h-4 w-4 items-center justify-center rounded-full"
                  style={{
                    background: `color-mix(in oklab, ${accentColor} 18%, transparent)`,
                  }}
                >
                  <div
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      background: accentColor,
                      boxShadow:
                        "0 0 0 1px color-mix(in oklab, var(--background) 82%, transparent)",
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>

          <div className="pointer-events-none absolute inset-y-3 left-3 w-14">
            {priceAxisTicks.map((tick) => (
              <div
                key={`${tick.label}:${tick.y.toFixed(2)}`}
                className="absolute left-0 -translate-y-1/2 font-departureMono text-[10px] text-muted-foreground"
                style={{
                  top: `${((tick.y / CHART_VIEWBOX_HEIGHT) * 100).toFixed(2)}%`,
                }}
              >
                {tick.label}
              </div>
            ))}
          </div>

          {lastCoordinate ? (
            <div
              className="pointer-events-none absolute rounded-none border px-2.5 py-1 font-departureMono text-[11px] shadow-[0_0_0_1px_color-mix(in_oklab,var(--background)_70%,transparent)]"
              style={{
                borderColor: `color-mix(in oklab, ${accentColor} 28%, transparent)`,
                color: accentColor,
                right: "0.75rem",
                top: `calc(${(
                  (lastCoordinate.y / CHART_VIEWBOX_HEIGHT) *
                  100
                ).toFixed(2)}% + 0.75rem)`,
                transform: "translateY(-50%)",
                background: `color-mix(in oklab, ${accentColor} 10%, var(--background))`,
              }}
            >
              {formatCurrency(displayedLastValue, {
                currency: currency ?? "USD",
              })}
            </div>
          ) : null}

          <div className="mt-3 border-t border-border/35 pt-2">
            <div
              className="mr-4 ml-14 grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${String(timeAxisTicks.length)}, minmax(0, 1fr))`,
              }}
            >
              {timeAxisTicks.map((tick, index) => (
                <div
                  key={`${tick.label}:${tick.x.toFixed(2)}`}
                  className={cn(
                    "min-w-0",
                    index === 0
                      ? "text-left"
                      : index === timeAxisTicks.length - 1
                        ? "text-right"
                        : "text-center"
                  )}
                >
                  <div className="text-[10px] text-muted-foreground">
                    {tick.label}
                  </div>
                  <div className="font-departureMono text-[9px] leading-tight text-muted-foreground/80">
                    {tick.detail}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
          {footerItems.map((item) => (
            <div
              key={item.label}
              className="market-panel-tile min-w-0 px-3 py-2.5 sm:px-4"
            >
              <span className="font-departureMono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                {item.label}
              </span>
              <div
                className={cn(
                  "mt-1 font-departureMono text-sm tracking-tight text-foreground",
                  item.tone
                )}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
