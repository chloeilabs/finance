import { useId } from "react"

import { cn } from "@/lib/utils"

const VIEWBOX_WIDTH = 100
const VIEWBOX_HEIGHT = 100
const CHART_PADDING_X = 4
const CHART_PADDING_Y = 14
const CHART_BASELINE_Y = VIEWBOX_HEIGHT - CHART_PADDING_Y
const CHART_DRAW_HEIGHT = VIEWBOX_HEIGHT - CHART_PADDING_Y * 2

interface SparklineCoordinate {
  x: number
  y: number
}

function buildCoordinates(points: number[]): SparklineCoordinate[] {
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min

  return points.map((point, index) => {
    const x =
      CHART_PADDING_X +
      (index / (points.length - 1)) * (VIEWBOX_WIDTH - CHART_PADDING_X * 2)
    const normalized = range === 0 ? 0.5 : (point - min) / range
    const y =
      CHART_BASELINE_Y - normalized * CHART_DRAW_HEIGHT

    return {
      x,
      y,
    }
  })
}

function buildLinePath(coordinates: SparklineCoordinate[]): string {
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

function buildAreaPath(coordinates: SparklineCoordinate[]): string {
  const linePath = buildLinePath(coordinates)
  const firstPoint = coordinates[0]
  const lastPoint = coordinates[coordinates.length - 1]

  if (!linePath || !firstPoint || !lastPoint) {
    return ""
  }

  return [
    linePath,
    `L ${lastPoint.x.toFixed(2)} ${CHART_BASELINE_Y.toFixed(2)}`,
    `L ${firstPoint.x.toFixed(2)} ${CHART_BASELINE_Y.toFixed(2)}`,
    "Z",
  ].join(" ")
}

export function Sparkline({
  values,
  className,
  positive,
}: {
  values: (number | null | undefined)[]
  className?: string
  positive?: boolean
}) {
  const gradientId = useId().replace(/:/g, "")
  const points = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  )

  if (points.length < 2) {
    return (
      <div
        className={cn(
          "h-12 w-full rounded-[0.35rem] border border-border/60 bg-background/40",
          className
        )}
      />
    )
  }

  const coordinates = buildCoordinates(points)
  const linePath = buildLinePath(coordinates)
  const areaPath = buildAreaPath(coordinates)
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const isPositive =
    positive ??
    (lastPoint !== undefined && firstPoint !== undefined
      ? lastPoint >= firstPoint
      : true)
  const accentColor = isPositive
    ? "var(--vesper-teal)"
    : "var(--vesper-orange)"

  return (
    <svg
      aria-hidden
      className={cn("h-12 w-full overflow-visible", className)}
      viewBox={["0", "0", String(VIEWBOX_WIDTH), String(VIEWBOX_HEIGHT)].join(
        " "
      )}
      preserveAspectRatio="none"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient
          id={`${gradientId}-fill`}
          x1="0"
          y1="0"
          x2="0"
          y2={String(VIEWBOX_HEIGHT)}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.22" />
          <stop offset="65%" stopColor={accentColor} stopOpacity="0.08" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="0" />
        </linearGradient>
        <linearGradient
          id={`${gradientId}-stroke`}
          x1="0"
          y1="0"
          x2={String(VIEWBOX_WIDTH)}
          y2="0"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={accentColor} stopOpacity="0.35" />
          <stop offset="45%" stopColor={accentColor} stopOpacity="0.7" />
          <stop offset="100%" stopColor={accentColor} stopOpacity="1" />
        </linearGradient>
      </defs>

      <line
        x1={String(CHART_PADDING_X)}
        x2={String(VIEWBOX_WIDTH - CHART_PADDING_X)}
        y1={String(CHART_BASELINE_Y)}
        y2={String(CHART_BASELINE_Y)}
        stroke="var(--border)"
        strokeDasharray="2 4"
        strokeOpacity="0.55"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />

      <path d={areaPath} fill={`url(#${gradientId}-fill)`} />
      <path
        d={linePath}
        fill="none"
        stroke={`url(#${gradientId}-stroke)`}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
