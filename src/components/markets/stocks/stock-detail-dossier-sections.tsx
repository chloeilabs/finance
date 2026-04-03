import Link from "next/link"

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
  formatPercent,
} from "@/lib/markets-format"
import type {
  EmployeeCountPoint,
  LockedMarketSection,
  MarketCapPoint,
} from "@/lib/shared/markets/intelligence"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"
import { cn } from "@/lib/utils"

import { SegmentationBlock } from "./stock-detail-common"
import {
  getBusinessSection,
  getContextSection,
  getFinancialSection,
} from "./stock-detail-data"

function formatSignedHistoryDelta(
  value: number,
  formatter: (point: number) => string
) {
  const prefix = value > 0 ? "+" : value < 0 ? "-" : ""

  return `${prefix}${formatter(Math.abs(value))}`
}

function getHistorySummary<T>({
  points,
  getDate,
  getValue,
}: {
  points: T[]
  getDate: (point: T) => string | null | undefined
  getValue: (point: T) => number | null | undefined
}) {
  const validPoints = points.filter((point) => {
    const value = getValue(point)
    return typeof value === "number" && Number.isFinite(value)
  })

  if (validPoints.length < 2) {
    return null
  }

  const firstPoint = validPoints[0]
  const lastPoint = validPoints[validPoints.length - 1]

  if (!firstPoint || !lastPoint) {
    return null
  }

  const firstValue = getValue(firstPoint)
  const lastValue = getValue(lastPoint)

  if (
    firstValue === null ||
    firstValue === undefined ||
    lastValue === null ||
    lastValue === undefined
  ) {
    return null
  }

  const change = lastValue - firstValue
  const percentChange = firstValue === 0 ? null : (change / firstValue) * 100

  return {
    firstDate: getDate(firstPoint),
    firstValue,
    lastDate: getDate(lastPoint),
    lastValue,
    change,
    percentChange,
    positive: change >= 0,
    values: validPoints.map((point) => getValue(point) ?? null),
  }
}

function HistoryTrendPanel({
  title,
  description,
  latestLabel,
  emptyTitle,
  emptyDescription,
  latestFormatter,
  deltaFormatter,
  points,
}: {
  title: string
  description: string
  latestLabel: string
  emptyTitle: string
  emptyDescription: string
  latestFormatter: (value: number) => string
  deltaFormatter: (value: number) => string
  points: {
    date: string | null | undefined
    value: number | null | undefined
  }[]
}) {
  const summary = getHistorySummary({
    points,
    getDate: (point) => point.date,
    getValue: (point) => point.value,
  })

  if (!summary) {
    return (
      <EmptyState title={emptyTitle} description={emptyDescription} />
    )
  }

  const deltaLabel = [
    formatSignedHistoryDelta(summary.change, deltaFormatter),
    summary.percentChange === null ? null : formatPercent(summary.percentChange),
  ]
    .filter(Boolean)
    .join(" / ")

  return (
    <div className="market-soft-surface px-4 py-4 sm:px-5">
      <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
        {title}
      </div>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">
        {description}
      </div>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">{latestLabel}</div>
          <div className="mt-1.5 text-2xl tracking-tight">
            {latestFormatter(summary.lastValue)}
          </div>
        </div>
        <div
          className={cn(
            "font-departureMono text-xs sm:text-sm",
            summary.positive
              ? "text-[color:var(--vesper-teal)]"
              : "text-[color:var(--vesper-orange)]"
          )}
        >
          {deltaLabel}
        </div>
      </div>

      <div className="mt-4 rounded-[0.4rem] border border-border/45 bg-background/55 px-3 py-3 sm:px-4">
        <Sparkline
          className="h-28"
          positive={summary.positive}
          values={summary.values}
        />
      </div>

      <div className="mt-4 grid gap-4 border-t border-border/45 pt-4 sm:grid-cols-2">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            {formatDate(summary.firstDate)}
          </div>
          <div className="mt-1.5 text-sm tracking-tight">
            {latestFormatter(summary.firstValue)}
          </div>
        </div>
        <div className="min-w-0 sm:text-right">
          <div className="text-xs text-muted-foreground">
            {formatDate(summary.lastDate)}
          </div>
          <div className="mt-1.5 text-sm tracking-tight">
            {latestFormatter(summary.lastValue)}
          </div>
        </div>
      </div>
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

        <div className="market-split-20 grid gap-3">
          <HistoryTrendPanel
            deltaFormatter={(value) =>
              formatCurrency(value, {
                compact: true,
              })
            }
            description="Latest reported market cap trend across the available filing history."
            emptyDescription="Market cap history will appear here when historical market cap records are available."
            emptyTitle="No market cap history"
            latestFormatter={(value) =>
              formatCurrency(value, {
                compact: true,
              })
            }
            latestLabel="Latest market cap"
            points={business.marketCapHistory.map((item: MarketCapPoint) => ({
              date: item.date,
              value: item.marketCap,
            }))}
            title="Market Cap History"
          />
          <HistoryTrendPanel
            deltaFormatter={(value) => formatCompactNumber(value)}
            description="Reported employee count trend based on the company filing record."
            emptyDescription="Employee history will appear here when workforce records are available."
            emptyTitle="No employee history"
            latestFormatter={(value) => formatCompactNumber(value)}
            latestLabel="Latest employee count"
            points={business.employeeHistory.map((item: EmployeeCountPoint) => ({
              date: item.periodOfReport ?? item.acceptanceTime,
              value: item.employeeCount,
            }))}
            title="Employee History"
          />
          <div className="market-panel-list">
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">Registrant</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.registrantName ?? "N/A"}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">CIK</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.cik ?? "N/A"}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">SIC</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.sicCode ?? "N/A"}{" "}
                {business.secProfile?.sicDescription ?? ""}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">Free Float</div>
              <div className="mt-2 text-sm">
                {formatPercent(business.shareFloat?.freeFloatPercentage)}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">Float Shares</div>
              <div className="mt-2 text-sm">
                {formatCompactNumber(business.shareFloat?.floatShares)}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">
                Outstanding Shares
              </div>
              <div className="mt-2 text-sm">
                {formatCompactNumber(business.shareFloat?.outstandingShares)}
              </div>
            </div>
          </div>

          <div className="market-panel-list">
            {business.executives.length > 0 ? (
              business.executives.map((executive, index) => (
                <div
                  key={[
                    executive.name ?? "name",
                    executive.title ?? "title",
                    String(index),
                  ].join(":")}
                  className="market-panel-tile px-3 py-2.5 sm:px-4"
                >
                  <div className="text-xs text-muted-foreground">
                    {executive.title ?? "Executive"}
                  </div>
                  <div className="mt-2 text-sm">
                    {executive.name ?? "Unknown"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(executive.pay, {
                      currency: executive.currencyPay ?? "USD",
                      compact: true,
                    })}
                  </div>
                </div>
              ))
            ) : (
              <EmptyState
                title="No executive roster"
                description="Key executives will appear here when the company reference endpoint returns leadership data."
              />
            )}
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
          <div className="market-table-frame">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-background/80 text-left">
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
                    DCF
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Free Float
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
                    className="border-b border-border/35 last:border-b-0"
                  >
                    <td className="px-3 py-3">
                      <div>
                        <Link
                          className="font-departureMono text-sm tracking-tight hover:underline"
                          href={getTickerHref(peer.symbol, "stock")}
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
                      {formatCurrency(peer.dcf)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatPercent(peer.freeFloatPercentage)}
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
        <div className="market-grid-3 market-panel-grid grid">
          {sections.map((section) => (
            <div
              key={section.title}
              className="market-panel-tile px-3 py-3 sm:px-4"
            >
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
