import {
  CalendarList,
  MoverGrid,
  NewsList,
  PageHeader,
  QuoteStrip,
  SectionFrame,
  SectorGrid,
} from "@/components/markets/ui/market-primitives"
import { formatNumericDate, formatSignedNumber } from "@/lib/markets-format"
import { getCurrentViewer } from "@/lib/server/auth-session"
import {
  getMarketOverviewData,
} from "@/lib/server/markets/service"

function formatRiskPremium(value: number | null | undefined) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "N/A"
  }

  return `${formatSignedNumber(value)}%`
}

export default async function Home() {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return null
  }

  const overview = await getMarketOverviewData(viewer.id)
  const riskPremium = overview.riskPremium
  const impliedBaseEquityPremium =
    riskPremium?.countryRiskPremium != null &&
    riskPremium.totalEquityRiskPremium != null
      ? riskPremium.totalEquityRiskPremium - riskPremium.countryRiskPremium
      : null

  return (
    <div className="pb-10">
      <PageHeader
        title="Market overview"
        titleClassName="font-departureMono text-base tracking-tight sm:text-lg"
      />

      <SectionFrame>
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Benchmarks
            </div>
            <QuoteStrip
              linkItems={false}
              quotes={overview.indexes}
            />
          </div>

          <div className="space-y-3">
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

      <SectionFrame>
        <div className="space-y-6">
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
              US risk premium
            </div>
            <p className="max-w-3xl text-xs leading-5 text-muted-foreground">
              Extra annual return investors demand over a risk-free rate to own{" "}
              {riskPremium?.country ?? "United States"} equities.
              Total equity risk premium equals the base mature-market premium
              plus the country-specific risk overlay.
            </p>
            <div className="market-grid-3 market-panel-grid grid">
              <div className="market-panel-tile px-3 py-2.5 sm:px-4">
                <div className="text-xs text-muted-foreground">
                  Country Risk Premium
                </div>
                <div className="mt-2 text-lg tracking-tight">
                  {formatRiskPremium(riskPremium?.countryRiskPremium)}
                </div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  Country-specific sovereign and market-risk add-on.
                </div>
              </div>
              <div className="market-panel-tile px-3 py-2.5 sm:px-4">
                <div className="text-xs text-muted-foreground">
                  Implied Base Equity Premium
                </div>
                <div className="mt-2 text-lg tracking-tight">
                  {formatRiskPremium(impliedBaseEquityPremium)}
                </div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  Mature-market equity premium before the country overlay.
                </div>
              </div>
              <div className="market-panel-tile px-3 py-2.5 sm:px-4">
                <div className="text-xs text-muted-foreground">
                  Total Equity Risk Premium
                </div>
                <div className="mt-2 text-lg tracking-tight">
                  {formatRiskPremium(riskPremium?.totalEquityRiskPremium)}
                </div>
                <div className="mt-1 text-xs leading-5 text-muted-foreground">
                  Common input for cost-of-equity and discount-rate models.
                </div>
              </div>
            </div>
            <div className="text-xs leading-5 text-muted-foreground">
              Shorthand: cost of equity = risk-free rate + beta x total equity
              risk premium.
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
                    {formatNumericDate(item.date)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame>
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
        </div>
      </SectionFrame>
    </div>
  )
}
