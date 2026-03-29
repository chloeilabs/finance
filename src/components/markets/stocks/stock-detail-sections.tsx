import Link from "next/link"
import { cache } from "react"

import { StockTradingPanel } from "@/components/markets/stocks/stock-trading-panel"
import {
  CalendarList,
  EmptyState,
  FilingList,
  MetricGrid,
  NewsList,
  SectionFrame,
  StatementTables,
} from "@/components/markets/ui/market-primitives"
import { Sparkline } from "@/components/markets/ui/sparkline"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatLabeledMetricValue,
  formatMetricValue,
} from "@/lib/markets-format"
import {
  getStockDossierBusinessSection,
  getStockDossierContextSection,
  getStockDossierFinancialSection,
  getStockDossierStreetViewSection,
  getStockDossierTradingSection,
} from "@/lib/server/markets/service"
import type { LockedMarketSection, RevenueSegmentation } from "@/lib/shared"

const getTradingSection = cache(getStockDossierTradingSection)
const getStreetViewSection = cache(getStockDossierStreetViewSection)
const getFinancialSection = cache(getStockDossierFinancialSection)
const getBusinessSection = cache(getStockDossierBusinessSection)
const getContextSection = cache(getStockDossierContextSection)

function SegmentationBlock({
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
    <div className="space-y-3 border border-border/70 px-4 py-4">
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
    ["plan-limits", "Plan Limits"],
  ] as const

  return (
    <div className="sticky top-0 z-20 border-y border-border/70 bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
      <div className="flex gap-2 overflow-x-auto">
        {items.map(([id, label]) => (
          <a
            key={id}
            className="shrink-0 border border-border/70 px-3 py-1 text-xs transition-colors hover:bg-muted/35"
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
      <div className="border border-border/70 bg-background px-4 py-8 text-sm text-muted-foreground">
        Loading {title.toLowerCase()}...
      </div>
    </SectionFrame>
  )
}

export async function StockTradingSection({
  symbol,
  currency,
}: {
  symbol: string
  currency?: string | null
}) {
  const trading = await getTradingSection(symbol)

  return (
    <div id="trading">
      <SectionFrame title="Trading">
        <StockTradingPanel
          aftermarket={trading.aftermarket}
          currency={currency}
          intradayCharts={trading.intradayCharts}
          priceChange={trading.priceChange}
        />
      </SectionFrame>
    </div>
  )
}

export async function StockStreetViewSection({ symbol }: { symbol: string }) {
  const street = await getStreetViewSection(symbol)

  return (
    <div id="street-view">
      <SectionFrame title="Street View">
        <div className="market-split-18 grid gap-4">
          <div className="grid gap-px border border-border/70 bg-border/70">
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">Consensus</div>
              <div className="mt-2 text-lg tracking-tight">
                {street.analyst?.ratingSummary ??
                  street.gradesConsensus?.consensus ??
                  "N/A"}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">Target Range</div>
              <div className="mt-2 text-sm">
                {formatCurrency(street.analyst?.targetLow)} to{" "}
                {formatCurrency(street.analyst?.targetHigh)}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Consensus Target
              </div>
              <div className="mt-2 text-lg tracking-tight">
                {formatCurrency(street.analyst?.targetConsensus)}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">Grade Mix</div>
              <div className="mt-2 space-y-1 text-sm">
                <div>
                  Strong Buy: {street.gradesConsensus?.strongBuy ?? "N/A"}
                </div>
                <div>Buy: {street.gradesConsensus?.buy ?? "N/A"}</div>
                <div>Hold: {street.gradesConsensus?.hold ?? "N/A"}</div>
                <div>Sell: {street.gradesConsensus?.sell ?? "N/A"}</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {street.analystEstimates.length > 0 ? (
              <div className="overflow-x-auto border border-border/70">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/30 text-left">
                      <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                        Estimate
                      </th>
                      <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                        Revenue Avg
                      </th>
                      <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                        EBITDA Avg
                      </th>
                      <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                        EPS Avg
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {street.analystEstimates.map((estimate, index) => (
                      <tr
                        key={`${estimate.date ?? "estimate"}:${String(index)}`}
                        className="border-b border-border/40 last:border-b-0"
                      >
                        <td className="px-3 py-2">
                          {formatDate(estimate.date)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCompactNumber(estimate.revenueAvg)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatCompactNumber(estimate.ebitdaAvg)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {formatMetricValue(estimate.epsAvg)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="No analyst estimates"
                description="Forward estimate ranges were not returned for this symbol."
              />
            )}

            {street.ratingsHistory.length > 0 ? (
              <div className="overflow-x-auto border border-border/70">
                <table className="min-w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border/70 bg-muted/30 text-left">
                      <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                        Date
                      </th>
                      <th className="px-3 py-2 font-departureMono text-xs tracking-tight text-muted-foreground">
                        Rating
                      </th>
                      <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                        Overall
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {street.ratingsHistory.map((entry) => (
                      <tr
                        key={`${entry.date ?? "date"}:${entry.rating ?? "rating"}`}
                        className="border-b border-border/40 last:border-b-0"
                      >
                        <td className="px-3 py-2">{formatDate(entry.date)}</td>
                        <td className="px-3 py-2">{entry.rating ?? "N/A"}</td>
                        <td className="px-3 py-2 text-right">
                          {entry.overallScore ?? "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      </SectionFrame>
    </div>
  )
}

export async function StockQualitySection({ symbol }: { symbol: string }) {
  const street = await getStreetViewSection(symbol)
  const metrics = street.financialScores
    ? [
        { label: "Altman Z", value: street.financialScores.altmanZScore },
        { label: "Piotroski", value: street.financialScores.piotroskiScore },
        {
          label: "Working Capital",
          value: street.financialScores.workingCapital,
        },
        { label: "Revenue", value: street.financialScores.revenue },
        {
          label: "Total Liabilities",
          value: street.financialScores.totalLiabilities,
        },
      ]
    : []

  return (
    <div id="quality">
      <SectionFrame title="Quality">
        <MetricGrid metrics={metrics} />
      </SectionFrame>
    </div>
  )
}

export async function StockFinancialSection({ symbol }: { symbol: string }) {
  const financial = await getFinancialSection(symbol)

  return (
    <div id="financials">
      <SectionFrame title="Statements">
        <StatementTables tables={financial.statements} />
      </SectionFrame>

      <SectionFrame title="Growth">
        <MetricGrid metrics={financial.growth} />
      </SectionFrame>
    </div>
  )
}

export async function StockBusinessMixSection({ symbol }: { symbol: string }) {
  const business = await getBusinessSection(symbol)

  return (
    <div id="business-mix">
      <SectionFrame title="Business Mix">
        <div className="market-grid-2 grid gap-4">
          <SegmentationBlock
            segmentation={business.productSegments}
            title="Product Mix"
          />
          <SegmentationBlock
            segmentation={business.geographicSegments}
            title="Geographic Mix"
          />
        </div>

        <div className="market-split-20 grid gap-4">
          <div className="border border-border/70 px-4 py-4">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Market Cap History
            </div>
            <Sparkline
              className="mt-5 h-20"
              values={business.marketCapHistory.map((item) => item.marketCap)}
            />
          </div>
          <div className="border border-border/70 px-4 py-4">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Employee History
            </div>
            <Sparkline
              className="mt-5 h-20"
              values={business.employeeHistory.map(
                (item) => item.employeeCount
              )}
            />
          </div>
          <div className="grid gap-px border border-border/70 bg-border/70">
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">Registrant</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.registrantName ?? "N/A"}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">CIK</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.cik ?? "N/A"}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">SIC</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.sicCode ?? "N/A"}{" "}
                {business.secProfile?.sicDescription ?? ""}
              </div>
            </div>
          </div>
        </div>
      </SectionFrame>
    </div>
  )
}

export async function StockPeersSection({ symbol }: { symbol: string }) {
  const business = await getBusinessSection(symbol)

  return (
    <div id="peers">
      <SectionFrame title="Peers">
        {business.peers.length > 0 ? (
          <div className="overflow-x-auto border border-border/70">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-left">
                  <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                    Symbol
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Price
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    P/E
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    FCF Yield
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    ROIC
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Piotroski
                  </th>
                </tr>
              </thead>
              <tbody>
                {business.peers.map((peer) => (
                  <tr
                    key={peer.symbol}
                    className="border-b border-border/40 last:border-b-0"
                  >
                    <td className="px-3 py-3">
                      <div>
                        <Link
                          className="font-departureMono text-sm tracking-tight hover:underline"
                          href={`/stocks/${encodeURIComponent(peer.symbol)}`}
                        >
                          {peer.symbol}
                        </Link>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {peer.companyName ?? "Peer company"}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(peer.price)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMetricValue(peer.peRatio)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatLabeledMetricValue("FCF Yield", peer.fcfYield)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatLabeledMetricValue("ROIC", peer.roic)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMetricValue(peer.piotroskiScore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No peer set"
            description="Peer comparison is unavailable for this symbol."
          />
        )}
      </SectionFrame>
    </div>
  )
}

export async function StockCatalystsSection({ symbol }: { symbol: string }) {
  const context = await getContextSection(symbol)

  return (
    <div id="catalysts">
      <SectionFrame title="Catalysts">
        <CalendarList events={context.calendar} />
      </SectionFrame>

      <SectionFrame title="Filings">
        <FilingList items={context.filings} />
      </SectionFrame>

      <SectionFrame title="News">
        <NewsList stories={context.news} />
      </SectionFrame>
    </div>
  )
}

export function StockPlanLimitsSection({
  sections,
}: {
  sections: LockedMarketSection[]
}) {
  if (sections.length === 0) {
    return null
  }

  return (
    <div id="plan-limits">
      <SectionFrame title="Plan limits">
        <div className="market-grid-3 grid gap-px border border-border/70 bg-border/70">
          {sections.map((section) => (
            <div key={section.title} className="bg-background px-4 py-4">
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Locked
              </div>
              <div className="mt-3 text-sm">{section.title}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </SectionFrame>
    </div>
  )
}
