import {
  EmptyState,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
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

export function StockSectionNav() {
  const items = [
    ["summary", "Summary"],
    ["trading", "Trading"],
    ["street-view", "Street View"],
    ["quality", "Quality"],
    ["financials", "Financials"],
    ["business-mix", "Business Mix"],
    ["peers", "Peers"],
    ["catalysts", "Catalysts"],
  ] as const

  return (
    <div className="sticky top-0 z-20 bg-background/95 px-4 py-2.5 backdrop-blur sm:px-6">
      <div className="flex gap-2 overflow-x-auto">
        {items.map(([id, label]) => (
          <a
            key={id}
            className="market-chip shrink-0 px-3 py-1 text-xs transition-colors hover:bg-muted/60"
            href={`#${id}`}
          >
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}

export function SectionLoadingState({ title }: { title: string }) {
  return (
    <SectionFrame title={title}>
      <div className="market-soft-surface px-4 py-8 text-sm text-muted-foreground">
        Loading {title.toLowerCase()}...
      </div>
    </SectionFrame>
  )
}
