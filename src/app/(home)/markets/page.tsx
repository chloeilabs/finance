import Link from "next/link"

import { AssetTeaserGrid } from "@/components/markets/assets/asset-market-grid"
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
import { Button } from "@/components/ui/button"
import { formatSignedNumber } from "@/lib/markets-format"
import {
  getMarketsSnapshot,
  getMultiAssetSnapshot,
} from "@/lib/server/markets/service"

export default async function MarketsPage() {
  const [snapshot, assets] = await Promise.all([
    getMarketsSnapshot(),
    getMultiAssetSnapshot(),
  ])

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Markets" title="Broad market snapshot" />

      <SectionFrame title="Benchmarks">
        <QuoteStrip linkItems={false} quotes={snapshot.indexes} />
      </SectionFrame>

      <SectionFrame
        title="Cross-asset tape"
        description="Starter coverage extends past US equities, so keep a live read on crypto, forex, and commodity symbols from the same workspace."
        aside={
          <Button asChild size="sm" variant="outline">
            <Link href="/assets">Open Assets</Link>
          </Button>
        }
      >
        <AssetTeaserGrid groups={assets.groups} />
      </SectionFrame>

      <SectionFrame title="Sector breadth">
        <SectorGrid sectors={snapshot.sectors} />
      </SectionFrame>

      <SectionFrame title="Tape leaders">
        <div className="market-grid-3 grid gap-3">
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

      <SectionFrame title="Macro context">
        <div className="market-grid-6 market-panel-grid grid">
          {snapshot.macro.map((item) => (
            <div
              key={`${item.label}:${item.date ?? "current"}`}
              className="market-panel-tile px-3 py-2.5 sm:px-4"
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

      <SectionFrame title="Economic releases">
        <CalendarList events={snapshot.economicCalendar} />
      </SectionFrame>

      <SectionFrame title="Exchange clock">
        <div className="market-grid-3 market-panel-grid grid">
          {snapshot.marketHours.map((item) => (
            <div
              key={item.exchange}
              className="market-panel-tile px-3 py-2.5 sm:px-4"
            >
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

      <SectionFrame title="Upcoming holidays">
        <div className="market-grid-3 market-panel-grid grid">
          {snapshot.marketHolidays.map((item) => (
            <div
              key={`${item.exchange}:${item.date ?? ""}`}
              className="market-panel-tile px-3 py-2.5 sm:px-4"
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

      <SectionFrame title="Sector valuation">
        <div className="market-grid-4 market-panel-grid grid">
          {snapshot.sectorValuations.map((item) => (
            <div
              key={`${item.sector}:${item.exchange ?? ""}`}
              className="market-panel-tile px-3 py-2.5 sm:px-4"
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

      <SectionFrame title="Historical sector performance">
        <div className="market-grid-4 market-panel-grid grid">
          {snapshot.sectorHistory.map((series) => (
            <div
              key={series.sector}
              className="market-panel-tile px-3 py-2.5 sm:px-4"
            >
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

      <SectionFrame title="US risk premium">
        <div className="market-grid-2 market-panel-grid grid">
          <div className="market-panel-tile px-3 py-2.5 sm:px-4">
            <div className="text-xs text-muted-foreground">
              Country Risk Premium
            </div>
            <div className="mt-2 text-lg tracking-tight">
              {formatSignedNumber(snapshot.riskPremium?.countryRiskPremium)}
            </div>
          </div>
          <div className="market-panel-tile px-3 py-2.5 sm:px-4">
            <div className="text-xs text-muted-foreground">
              Total Equity Risk Premium
            </div>
            <div className="mt-2 text-lg tracking-tight">
              {formatSignedNumber(snapshot.riskPremium?.totalEquityRiskPremium)}
            </div>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame title="General headlines">
        <NewsList stories={snapshot.generalNews} />
      </SectionFrame>
    </div>
  )
}
