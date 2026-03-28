import { cn } from "@/lib/utils"

export function Sparkline({
  values,
  className,
}: {
  values: (number | null | undefined)[]
  className?: string
}) {
  const points = values.filter(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value)
  )

  if (points.length < 2) {
    return (
      <div
        className={cn(
          "h-12 w-full border border-border/70 bg-background/60",
          className
        )}
      />
    )
  }

  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const polyline = points
    .map((point, index) => {
      const x = (index / (points.length - 1)) * 100
      const y = 100 - ((point - min) / range) * 100
      return [x.toFixed(2), y.toFixed(2)].join(",")
    })
    .join(" ")
  const firstPoint = points[0]
  const lastPoint = points[points.length - 1]
  const positive = lastPoint !== undefined && firstPoint !== undefined
    ? lastPoint >= firstPoint
    : true

  return (
    <svg
      aria-hidden
      className={cn("h-12 w-full overflow-visible", className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        points={polyline}
        stroke={positive ? "var(--vesper-teal)" : "var(--vesper-orange)"}
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
