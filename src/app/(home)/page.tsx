import { AssetTeaserGrid } from "@/components/markets/assets/asset-market-grid"
import {
  CalendarList,
  FilingList,
  InsiderFeedList,
  MoverGrid,
  NewsList,
  PageHeader,
  QuoteStrip,
  SectionFrame,
  SectorGrid,
} from "@/components/markets/ui/market-primitives"
import { Sparkline } from "@/components/markets/ui/sparkline"
import { formatSignedNumber } from "@/lib/markets-format"
import { getCurrentViewer } from "@/lib/server/auth-session"
import {
  getLatestInsiderFeed,
  getLatestSecActivity,
  getMarketOverviewData,
  getMultiAssetSnapshot,
} from "@/lib/server/markets/service"

export default async function Home() {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return null
  }

  const [overview, assets, latestFilings, latestInsiderTrades] =
    await Promise.all([
      getMarketOverviewData(viewer.id),
      getMultiAssetSnapshot(),
      getLatestSecActivity(),
      getLatestInsiderFeed(),
    ])

  return (
    <div className="pb-10">
      <PageHeader
        title="Market overview"
        description="A watchlist-first dashboard that keeps the broad tape, cross-asset context, catalysts, and news in one workspace."
      />

      <SectionFrame
        title="My Market"
        description={`Primary focus from ${overview.watchlist.name}, with the watchlist front and center before the rest of the tape.`}
      >
        <QuoteStrip
          quotes={overview.watchlist.quotes}
          sparklines={overview.watchlist.sparklines}
        />
      </SectionFrame>

      <SectionFrame
        title="Market Snapshot"
        description="Benchmarks, leaders, and sector breadth grouped together so the broad market read is one scan."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Benchmarks
            </div>
            <QuoteStrip
              linkItems={false}
              quotes={overview.indexes}
              sparklines={overview.indexSparklines}
            />
          </div>

          <div className="space-y-3">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Tape leaders
            </div>
            <div className="market-grid-3 grid gap-3">
              {overview.movers.map((bucket) => (
                <div key={bucket.label} className="space-y-3">
                  <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                    {bucket.label}
                  </div>
                  <MoverGrid quotes={bucket.items} />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Sector breadth
            </div>
            <SectorGrid sectors={overview.sectors} />
          </div>
        </div>
      </SectionFrame>

      <SectionFrame
        title="Cross-Asset + Macro"
        description="Multi-asset tape and macro structure pulled into one band so the non-equity context stays attached to the core market view."
      >
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Cross-asset tape
            </div>
            <AssetTeaserGrid groups={assets.groups} />
          </div>

          <div className="space-y-3">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Macro rates
            </div>
            <div className="market-grid-6 market-panel-grid grid">
              {overview.macro.map((item) => (
                <div
                  key={`${item.label}:${item.date ?? "current"}`}
                  className="market-panel-tile px-3 py-2.5 sm:px-4"
                >
                  <div className="text-xs text-muted-foreground">
                    {item.label}
                  </div>
                  <div className="mt-3 text-lg tracking-tight">
                    {item.value !== null
                      ? formatSignedNumber(item.value)
                      : "N/A"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {item.date ?? "Latest"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Sector valuation
              </div>
              <div className="market-grid-2 market-panel-grid grid sm:grid-cols-4 xl:grid-cols-2">
                {overview.sectorValuations.map((item) => (
                  <div
                    key={`${item.sector}:${item.exchange ?? ""}`}
                    className="market-panel-tile px-3 py-2.5 sm:px-4"
                  >
                    <div className="text-xs text-muted-foreground">
                      {item.sector}
                    </div>
                    <div className="mt-2 text-lg tracking-tight">
                      {item.pe?.toFixed(2) ?? "N/A"}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {item.exchange ?? "Market-wide"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Historical sector performance
              </div>
              <div className="market-grid-2 market-panel-grid grid sm:grid-cols-4 xl:grid-cols-2">
                {overview.sectorHistory.map((series) => (
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
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                US risk premium
              </div>
              <div className="market-grid-2 market-panel-grid grid">
                <div className="market-panel-tile px-3 py-2.5 sm:px-4">
                  <div className="text-xs text-muted-foreground">
                    Country Risk Premium
                  </div>
                  <div className="mt-2 text-lg tracking-tight">
                    {formatSignedNumber(
                      overview.riskPremium?.countryRiskPremium
                    )}
                  </div>
                </div>
                <div className="market-panel-tile px-3 py-2.5 sm:px-4">
                  <div className="text-xs text-muted-foreground">
                    Total Equity Risk Premium
                  </div>
                  <div className="mt-2 text-lg tracking-tight">
                    {formatSignedNumber(
                      overview.riskPremium?.totalEquityRiskPremium
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Exchange state
              </div>
              <div className="market-grid-3 market-panel-grid grid">
                {overview.marketHours.map((item) => (
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
                      {item.openingHour ?? "N/A"} to {item.closingHour ?? "N/A"}{" "}
                      {item.timezone ?? ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Upcoming holidays
            </div>
            <div className="market-grid-3 market-panel-grid grid">
              {overview.marketHolidays.map((item) => (
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
          </div>
        </div>
      </SectionFrame>

      <SectionFrame
        title="Catalysts + News"
        description="Catalysts, economic releases, and the main information feeds grouped together so the forward calendar and latest tape stay adjacent."
      >
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Upcoming catalysts
              </div>
              <CalendarList events={overview.calendar} />
            </div>

            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Economic releases
              </div>
              <CalendarList events={overview.economicCalendar} />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Stock feed
              </div>
              <NewsList stories={overview.news} />
            </div>

            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                General feed
              </div>
              <NewsList stories={overview.generalNews} />
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Latest SEC activity
              </div>
              <FilingList items={latestFilings} />
            </div>

            <div className="space-y-3">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Latest insider tape
              </div>
              <InsiderFeedList items={latestInsiderTrades} />
            </div>
          </div>
        </div>
      </SectionFrame>
    </div>
  )
}
