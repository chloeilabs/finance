import { EmptyState } from "@/components/markets/ui/market-primitives"
import {
  formatCurrency,
  formatPercent,
} from "@/lib/markets-format"
import type { PortfolioAllocationBucket } from "@/lib/shared/markets/portfolio"

function AllocationList({
  buckets,
  emptyDescription,
  title,
}: {
  buckets: PortfolioAllocationBucket[]
  emptyDescription: string
  title: string
}) {
  if (buckets.length === 0) {
    return (
      <EmptyState
        title={`No ${title.toLowerCase()} yet`}
        description={emptyDescription}
      />
    )
  }

  return (
    <div className="market-soft-surface px-4 py-4">
      <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </div>
      <div className="mt-4 space-y-3">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate">{bucket.label}</span>
              <div className="text-right">
                <div>{formatPercent(bucket.weight, { scale: "fraction" })}</div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(bucket.value, { currency: "USD", compact: true })}
                </div>
              </div>
            </div>
            <div className="h-2 bg-muted/50">
              {(() => {
                const widthPercent = String(
                  Math.max(0, Math.min(bucket.weight * 100, 100))
                )

                return (
                  <div
                    className="h-full bg-[color:var(--vesper-teal)]"
                    style={{
                      width: `${widthPercent}%`,
                    }}
                  />
                )
              })()}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PortfolioAllocation({
  instrumentAllocations,
  sectorAllocations,
}: {
  instrumentAllocations: PortfolioAllocationBucket[]
  sectorAllocations: PortfolioAllocationBucket[]
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <AllocationList
        buckets={sectorAllocations}
        emptyDescription="Add holdings with sector coverage to see concentration by industry group."
        title="Sector Exposure"
      />
      <AllocationList
        buckets={instrumentAllocations}
        emptyDescription="Add holdings or cash to see how the portfolio is split across instruments."
        title="Instrument Mix"
      />
    </div>
  )
}
