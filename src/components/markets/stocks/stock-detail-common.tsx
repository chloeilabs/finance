import { EmptyState } from "@/components/markets/ui/market-primitives"
import { formatCompactNumber } from "@/lib/markets-format"
import type { RevenueSegmentation } from "@/lib/shared/markets/intelligence"

export function SegmentationBlock({
  title,
  segmentation,
}: {
  title: string
  segmentation: RevenueSegmentation | null
}) {
  if (!segmentation || segmentation.segments.length === 0) {
    return (
      <EmptyState
        title={`No ${title.toLowerCase()} data`}
        description={`The ${title.toLowerCase()} feed did not return coverage for this symbol.`}
      />
    )
  }

  return (
    <div className="market-soft-surface space-y-3 px-4 py-4">
      <div>
        <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {title}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {segmentation.period ?? "Period"} {segmentation.fiscalYear ?? ""}
        </div>
      </div>
      <div className="space-y-2">
        {segmentation.segments.slice(0, 8).map((segment) => (
          <div
            key={segment.label}
            className="flex items-center justify-between gap-3 text-sm"
          >
            <span className="truncate text-muted-foreground">
              {segment.label}
            </span>
            <span>{formatCompactNumber(segment.value)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
