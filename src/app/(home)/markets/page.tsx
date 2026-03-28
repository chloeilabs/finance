import {
  MoverGrid,
  PageHeader,
  QuoteStrip,
  SectionFrame,
  SectorGrid,
} from "@/components/markets/ui/market-primitives"
import { formatSignedNumber } from "@/lib/markets-format"
import { getMarketsSnapshot } from "@/lib/server/markets/service"

export default async function MarketsPage() {
  const snapshot = await getMarketsSnapshot()

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Markets"
        title="Broad market snapshot"
        description="Indexes, sector breadth, movers, and macro context collected in one place for daily orientation."
      />

      <SectionFrame
        title="Benchmarks"
        description="Core benchmark strip for S&P 500, Nasdaq, Dow, and Russell context."
      >
        <QuoteStrip linkItems={false} quotes={snapshot.indexes} />
      </SectionFrame>

      <SectionFrame
        title="Sector breadth"
        description="Daily breadth across the major sectors."
      >
        <SectorGrid sectors={snapshot.sectors} />
      </SectionFrame>

      <SectionFrame
        title="Tape leaders"
        description="Leaders, laggards, and liquidity concentration."
      >
        <div className="grid gap-4 xl:grid-cols-3">
          {snapshot.movers.map((bucket) => (
            <div key={bucket.label} className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                {bucket.label}
              </div>
              <MoverGrid quotes={bucket.items} />
            </div>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame
        title="Macro context"
        description="A compact macro strip to keep risk context adjacent to equities."
      >
        <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2 xl:grid-cols-6">
          {snapshot.macro.map((item) => (
            <div
              key={`${item.label}:${item.date ?? "current"}`}
              className="bg-background px-4 py-3"
            >
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-2 text-lg tracking-tight">
                {item.value !== null ? formatSignedNumber(item.value) : "N/A"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.date ?? "Latest"}
              </div>
            </div>
          ))}
        </div>
      </SectionFrame>
    </div>
  )
}
