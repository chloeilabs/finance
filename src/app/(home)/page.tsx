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

export default async function Home() {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return null
  }

  const overview = await getMarketOverviewData(viewer.id)

  return (
    <div className="pb-10">
      <PageHeader title="Market overview" />

      <SectionFrame
        title={`${overview.watchlist.name} watchlist`}
      >
        <QuoteStrip quotes={overview.watchlist.quotes} />
      </SectionFrame>

      <SectionFrame
        title="Indexes"
      >
        <QuoteStrip linkItems={false} quotes={overview.indexes} />
      </SectionFrame>

      <SectionFrame
        title="Market pulse"
      >
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
      </SectionFrame>

      <SectionFrame
        title="Sector breadth"
      >
        <SectorGrid sectors={overview.sectors} />
      </SectionFrame>

      <SectionFrame
        title="Upcoming catalysts"
      >
        <CalendarList events={overview.calendar} />
      </SectionFrame>

      <SectionFrame
        title="Macro rates"
      >
        <div className="market-grid-6 market-panel-grid grid">
          {overview.macro.map((item) => (
            <div
              key={`${item.label}:${item.date ?? "current"}`}
              className="market-panel-tile px-3 py-2.5 sm:px-4"
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
      >
        <CalendarList events={overview.economicCalendar} />
      </SectionFrame>

      <SectionFrame
        title="Exchange state"
      >
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
      </SectionFrame>

      <SectionFrame
        title="Upcoming holidays"
      >
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
      </SectionFrame>

      <SectionFrame
        title="Sector valuation"
      >
        <div className="market-grid-4 market-panel-grid grid">
          {overview.sectorValuations.map((item) => (
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

      <SectionFrame
        title="General news"
      >
        <NewsList stories={overview.generalNews} />
      </SectionFrame>

      <SectionFrame
        title="News stream"
      >
        <NewsList stories={overview.news} />
      </SectionFrame>
    </div>
  )
}
