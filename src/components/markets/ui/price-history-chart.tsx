"use client"

import { useId, useState } from "react"

import { formatNumber, formatPercent } from "@/lib/markets-format"
import type { PricePoint } from "@/lib/shared/markets/core"
import { cn } from "@/lib/utils"

type ChartTimeframeId =
  | "1D"
  | "5D"
  | "1M"
  | "3M"
  | "6M"
  | "YTD"
  | "1Y"
  | "5Y"
  | "MAX"

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
  { id: "5D", label: "5D", longLabel: "5 days" },
  { id: "1M", label: "1M", longLabel: "1 month" },
  { id: "YTD", label: "YTD", longLabel: "year to date" },
  { id: "3M", label: "3M", longLabel: "3 months" },
  { id: "6M", label: "6M", longLabel: "6 months" },
  { id: "1Y", label: "1Y", longLabel: "1 year" },
  { id: "5Y", label: "5Y", longLabel: "5 years" },
  { ...MAX_TIMEFRAME, label: "Max", longLabel: "max range" },
] as const

const chartAxisDateLabelFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})
const chartTimeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
})
const CHART_VIEWBOX_WIDTH = 100
const CHART_VIEWBOX_HEIGHT = 56
const CHART_PADDING_X = 2.5
const CHART_TOP_Y = 4
const CHART_BOTTOM_Y = 52
const STOCK_ANALYSIS_POSITIVE_GREEN = "#059669"

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

function getMaxTimeframeLabel(historicalRangeLabel: string) {
  const fullRangeLabel = getFullRangeLabel(historicalRangeLabel)

  return TIMEFRAME_OPTIONS.some(
    (option) => option.id !== "MAX" && option.label === fullRangeLabel
  )
    ? "Max"
    : fullRangeLabel
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
    case "5D":
      return lastTimestamp - 4 * 86_400_000
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
    case "5Y":
      return shiftUtcDate(lastDate, { years: -5 }).getTime()
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
  const indexes = buildTickIndexes(series.length, options.intraday ? 5 : 4)

  return indexes
    .map((index) => {
      const point = series[index]

      if (!point) {
        return null
      }

      const parsed = new Date(point.timestamp)

      return {
        label: options.intraday
          ? formatIntradayTickLabel(parsed)
          : chartAxisDateLabelFormatter.format(parsed),
        x:
          CHART_PADDING_X +
          (index / (series.length - 1)) *
            (CHART_VIEWBOX_WIDTH - CHART_PADDING_X * 2),
      }
    })
    .filter((tick): tick is ChartTimeAxisTick => tick !== null)
}

function formatIntradayTickLabel(value: Date) {
  return chartTimeFormatter
    .format(value)
    .replace(":00", "")
    .replace(" AM", " am")
    .replace(" PM", " pm")
}

function buildPriceAxisTicks(low: number, high: number): ChartPriceAxisTick[] {
  const values =
    high === low
      ? [high]
      : Array.from({ length: 6 }, (_, position) => {
          const ratio = position / 5
          return Number((high - (high - low) * ratio).toFixed(2))
        })
  const range = high - low || 1

  return values.map((value) => ({
    label: formatChartPrice(value),
    y: getChartY(value, low, range),
  }))
}

function formatChartPrice(value: number) {
  return formatNumber(value, {
    digits: Math.abs(value) >= 1 ? 2 : 4,
  })
}

function getDefaultTimeframe(availableTimeframes: ChartTimeframeId[]) {
  const preferredOrder: ChartTimeframeId[] = [
    "1D",
    "5D",
    "1M",
    "YTD",
    "3M",
    "6M",
    "1Y",
    "5Y",
    "MAX",
  ]

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
  className,
  compact = false,
  points,
  intradayPoints = [],
  currentPrice,
  sessionChange,
  sessionChangePercent,
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
  const eodSeries = buildSeries(points)
  const intradaySeries = buildSeries(intradayPoints)
  const timeframeOptions = TIMEFRAME_OPTIONS.map((option) =>
    option.id === "MAX"
      ? {
          ...option,
          label: getMaxTimeframeLabel(historicalRangeLabel),
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
    label: getMaxTimeframeLabel(historicalRangeLabel),
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
  const accentColor = positive
    ? STOCK_ANALYSIS_POSITIVE_GREEN
    : "var(--vesper-orange)"
  const chartCoordinates = buildChartCoordinates(renderSeries, { low, range })
  const linePath = buildSmoothPath(chartCoordinates)
  const areaPath = buildAreaPath(chartCoordinates)
  const lastCoordinate = chartCoordinates[chartCoordinates.length - 1]
  const displayedLastValue =
    isIntradayView && currentPrice !== null && currentPrice !== undefined
      ? currentPrice
      : lastPoint.close
  const plotFrameStyle = {
    background:
      "linear-gradient(180deg, color-mix(in oklab, var(--background) 96%, transparent) 0%, color-mix(in oklab, var(--background) 90%, var(--muted)) 100%)",
  }
  const timeAxisTicks = buildTimeAxisTicks(visibleSeries, {
    intraday: isIntradayView,
  })
  const priceAxisTicks = buildPriceAxisTicks(low, high)
  const periodChangeLabel =
    percentChange === null || Number.isNaN(percentChange)
      ? "N/A"
      : `${percentChange > 0 ? "+" : ""}${formatPercent(percentChange)} (${activeTimeframe.label})`

  return (
    <div
      className={cn(
        "market-table-frame flex h-full flex-col overflow-hidden border border-border/40",
        className
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div
          className="inline-flex flex-wrap gap-1"
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
                  "rounded-none px-2.5 py-1.5 text-xs transition-colors",
                  resolvedTimeframe === option.id
                    ? "bg-muted text-foreground"
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

        <div className="text-sm font-medium" style={{ color: accentColor }}>
          {periodChangeLabel}
        </div>
      </div>

      <div
        className="relative flex flex-1 flex-col px-4 pb-3 pt-4"
        style={plotFrameStyle}
      >
        <div className="relative flex-1 overflow-hidden pr-12">
          <div className="relative h-full">
            <svg
              aria-hidden
              className={cn(
                "relative h-full w-full",
                compact ? "min-h-[14rem] lg:min-h-0" : "min-h-[18rem]"
              )}
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
                  className="flex h-4 w-4 items-center justify-center"
                  style={{
                    background: `color-mix(in oklab, ${accentColor} 18%, transparent)`,
                  }}
                >
                  <div
                    className="h-1.5 w-1.5"
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

          <div className="pointer-events-none absolute inset-y-5 right-0 w-12">
            {priceAxisTicks.map((tick) => (
              <div
                key={`${tick.label}:${tick.y.toFixed(2)}`}
                className="absolute right-0 -translate-y-1/2 text-right font-departureMono text-[10px] text-muted-foreground"
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
              className="pointer-events-none absolute border px-2.5 py-1 text-[11px] font-semibold text-white"
              style={{
                borderColor: accentColor,
                right: "2.75rem",
                top: `${((lastCoordinate.y / CHART_VIEWBOX_HEIGHT) * 100).toFixed(2)}%`,
                transform: "translateY(-50%)",
                background: accentColor,
              }}
            >
              {formatChartPrice(displayedLastValue)}
            </div>
          ) : null}
        </div>

        <div
          className="mt-3 grid gap-1 border-t border-border/35 pt-2 pr-12 text-[10px] text-muted-foreground"
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
              {tick.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
