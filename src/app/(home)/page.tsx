import {
  CalendarList,
  MoverGrid,
  NewsList,
  PageHeader,
  QuoteStrip,
  SectionFrame,
  SectorGrid,
} from "@/components/markets/ui/market-primitives"
import { formatSignedNumber } from "@/lib/markets-format"
import { getCurrentViewer } from "@/lib/server/auth-session"
import { getMarketOverviewData } from "@/lib/server/markets/service"
import type { FmpCoverageScope } from "@/lib/shared"

function formatCoverageScope(scope: FmpCoverageScope) {
  switch (scope) {
    case "us":
      return "US only"
    case "usUkCanada":
      return "US / UK / CA"
    case "global":
      return "Global"
  }
}

export default async function Home() {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return null
  }

  const overview = await getMarketOverviewData(viewer.id)
  const firstName = viewer.name.split(" ")[0] ?? ""

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Workspace"
        title="Market overview"
        description={`A stock-first research terminal for ${firstName === "" ? "your" : firstName} workflow. Quotes and broad-market panels stay plan-aware for the ${overview.plan.label} tier while deeper pages assemble the full company dossier.`}
        actions={
          <div className="market-grid-5 grid gap-px border border-border/70 bg-border/70 text-xs">
            <div className="bg-background px-3 py-2">
              <div className="text-muted-foreground">Tier</div>
              <div className="mt-1 font-departureMono tracking-tight">
                {overview.plan.label}
              </div>
            </div>
            <div className="bg-background px-3 py-2">
              <div className="text-muted-foreground">Coverage</div>
              <div className="mt-1 font-departureMono tracking-tight">
                {formatCoverageScope(overview.plan.capabilities.coverageScope)}
              </div>
            </div>
            <div className="bg-background px-3 py-2">
              <div className="text-muted-foreground">Freshness</div>
              <div className="mt-1 font-departureMono tracking-tight">
                {overview.plan.quoteFreshnessLabel}
              </div>
            </div>
            <div className="bg-background px-3 py-2">
              <div className="text-muted-foreground">Budget</div>
              <div className="mt-1 font-departureMono tracking-tight">
                {overview.plan.requestBudgetLabel}
              </div>
            </div>
            <div className="bg-background px-3 py-2">
              <div className="text-muted-foreground">Bandwidth</div>
              <div className="mt-1 font-departureMono tracking-tight">
                {overview.plan.bandwidthLimitLabel}
              </div>
            </div>
          </div>
        }
      />

      <SectionFrame
        title={`${overview.watchlist.name} watchlist`}
        description="Plan-aware quote caching keeps the home surface responsive without assuming batch quote access."
      >
        <QuoteStrip quotes={overview.watchlist.quotes} />
      </SectionFrame>

      <SectionFrame
        title="Indexes"
        description="Core US benchmarks, designed to orient the rest of the terminal quickly."
      >
        <QuoteStrip linkItems={false} quotes={overview.indexes} />
      </SectionFrame>

      <SectionFrame
        title="Market pulse"
        description="Leaders, laggards, and the names absorbing the most tape right now."
      >
        <div className="market-grid-3 grid gap-4">
          {overview.movers.map((bucket) => (
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
        title="Sector breadth"
        description="Fast breadth read on the parts of the market driving the session."
      >
        <SectorGrid sectors={overview.sectors} />
      </SectionFrame>

      <SectionFrame
        title="Upcoming catalysts"
        description="Near-term earnings and dividend events worth keeping on the radar."
      >
        <CalendarList events={overview.calendar} />
      </SectionFrame>

      <SectionFrame
        title="Macro rates"
        description="Treasury and macro prints that help frame equity risk."
      >
        <div className="market-grid-6 grid gap-px border border-border/70 bg-border/70">
          {overview.macro.map((item) => (
            <div
              key={`${item.label}:${item.date ?? "current"}`}
              className="bg-background px-4 py-3"
            >
              <div className="text-xs text-muted-foreground">{item.label}</div>
              <div className="mt-3 text-lg tracking-tight">
                {item.value !== null ? formatSignedNumber(item.value) : "N/A"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.date ?? "Latest"}
              </div>
            </div>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame
        title="Economic releases"
        description="Near-term macro events that can reset the tape."
      >
        <CalendarList events={overview.economicCalendar} />
      </SectionFrame>

      <SectionFrame
        title="Exchange state"
        description="Open and holiday context for the core US exchanges."
      >
        <div className="market-grid-3 grid gap-px border border-border/70 bg-border/70">
          {overview.marketHours.map((item) => (
            <div key={item.exchange} className="bg-background px-4 py-3">
              <div className="font-departureMono text-xs tracking-tight">
                {item.exchange}
              </div>
              <div className="mt-2 text-sm">
                {item.isMarketOpen ? "Open" : "Closed"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.openingHour ?? "N/A"} to {item.closingHour ?? "N/A"}{" "}
                {item.timezone ?? ""}
              </div>
            </div>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame
        title="Upcoming holidays"
        description="Next scheduled closures and adjusted sessions across the core US exchanges."
      >
        <div className="market-grid-3 grid gap-px border border-border/70 bg-border/70">
          {overview.marketHolidays.map((item) => (
            <div
              key={`${item.exchange}:${item.date ?? ""}`}
              className="bg-background px-4 py-3"
            >
              <div className="font-departureMono text-xs tracking-tight">
                {item.exchange}
              </div>
              <div className="mt-2 text-sm">{item.name ?? "Holiday"}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.date ?? "Date N/A"}
              </div>
            </div>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame
        title="Sector valuation"
        description="Same-day sector P/E snapshot to pair breadth with valuation."
      >
        <div className="market-grid-4 grid gap-px border border-border/70 bg-border/70">
          {overview.sectorValuations.map((item) => (
            <div
              key={`${item.sector}:${item.exchange ?? ""}`}
              className="bg-background px-4 py-3"
            >
              <div className="text-xs text-muted-foreground">{item.sector}</div>
              <div className="mt-2 text-lg tracking-tight">
                {item.pe?.toFixed(2) ?? "N/A"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.exchange ?? "Market-wide"}
              </div>
            </div>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame
        title="General news"
        description="Broader market and macro headlines beyond the stock-specific feed."
      >
        <NewsList stories={overview.generalNews} />
      </SectionFrame>

      <SectionFrame
        title="News stream"
        description="Headline tape for the watchlist and the wider market."
      >
        <NewsList stories={overview.news} />
      </SectionFrame>
    </div>
  )
}
