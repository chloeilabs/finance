import {
  CalendarList,
  MoverGrid,
  NewsList,
  PageHeader,
  QuoteStrip,
  SectionFrame,
  SectorGrid,
} from "@/components/markets/ui/market-primitives"
import { Sparkline } from "@/components/markets/ui/sparkline"
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
        <div className="market-grid-3 grid gap-4">
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
        <div className="market-grid-6 grid gap-px border border-border/70 bg-border/70">
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

      <SectionFrame
        title="Economic releases"
        description="Upcoming economic events that can move the broad tape."
      >
        <CalendarList events={snapshot.economicCalendar} />
      </SectionFrame>

      <SectionFrame
        title="Exchange clock"
        description="Open and holiday state for the core US exchanges."
      >
        <div className="market-grid-3 grid gap-px border border-border/70 bg-border/70">
          {snapshot.marketHours.map((item) => (
            <div key={item.exchange} className="bg-background px-4 py-3">
              <div className="font-departureMono text-xs tracking-tight">
                {item.exchange}
              </div>
              <div className="mt-2 text-sm">
                {item.isMarketOpen ? "Open" : "Closed"}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {item.openingHour ?? "N/A"} to {item.closingHour ?? "N/A"}
              </div>
            </div>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame
        title="Upcoming holidays"
        description="Next exchange closures and schedule adjustments."
      >
        <div className="market-grid-3 grid gap-px border border-border/70 bg-border/70">
          {snapshot.marketHolidays.map((item) => (
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
        description="Same-day sector P/E snapshot across the main sectors."
      >
        <div className="market-grid-4 grid gap-px border border-border/70 bg-border/70">
          {snapshot.sectorValuations.map((item) => (
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
        title="Historical sector performance"
        description="Recent trailing performance paths for key sectors."
      >
        <div className="market-grid-4 grid gap-px border border-border/70 bg-border/70">
          {snapshot.sectorHistory.map((series) => (
            <div key={series.sector} className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">
                {series.sector}
              </div>
              <Sparkline
                className="mt-4 h-16"
                values={series.points.map((point) => point.averageChange)}
              />
            </div>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame
        title="US risk premium"
        description="Country risk premium context for valuation and discount-rate framing."
      >
        <div className="market-grid-2 grid gap-px border border-border/70 bg-border/70">
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Country Risk Premium
            </div>
            <div className="mt-2 text-lg tracking-tight">
              {formatSignedNumber(snapshot.riskPremium?.countryRiskPremium)}
            </div>
          </div>
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">
              Total Equity Risk Premium
            </div>
            <div className="mt-2 text-lg tracking-tight">
              {formatSignedNumber(snapshot.riskPremium?.totalEquityRiskPremium)}
            </div>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame
        title="General headlines"
        description="Broader market headlines for macro and cross-asset context."
      >
        <NewsList stories={snapshot.generalNews} />
      </SectionFrame>
    </div>
  )
}
