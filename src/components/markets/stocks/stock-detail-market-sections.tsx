import { StockTradingPanel } from "@/components/markets/stocks/stock-trading-panel"
import {
  EmptyState,
  MetricGrid,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatMetricValue,
} from "@/lib/markets-format"
import type {
  AnalystEstimateSnapshot,
  RatingsHistoricalEntry,
} from "@/lib/shared/markets/intelligence"

import { getStreetViewSection, getTradingSection } from "./stock-detail-data"

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
          technicals={trading.technicals}
        />
      </SectionFrame>
    </div>
  )
}

export async function StockStreetViewSection({ symbol }: { symbol: string }) {
  const street = await getStreetViewSection(symbol)
  const summaryRows = [
    {
      label: "Consensus",
      value:
        street.analyst?.ratingSummary ?? street.gradesConsensus?.consensus ?? "N/A",
    },
    {
      label: "Consensus target",
      value: formatCurrency(street.analyst?.targetConsensus),
    },
    {
      label: "Target range",
      value: `${formatCurrency(street.analyst?.targetLow)} to ${formatCurrency(
        street.analyst?.targetHigh
      )}`,
    },
  ]
  const gradeMix = [
    ["Strong Buy", street.gradesConsensus?.strongBuy],
    ["Buy", street.gradesConsensus?.buy],
    ["Hold", street.gradesConsensus?.hold],
    ["Sell", street.gradesConsensus?.sell],
  ] as const

  return (
    <div id="street-view">
      <SectionFrame
        title="Street View"
        description="Analyst consensus, forward estimates, and recent rating history."
      >
        <div className="market-soft-surface overflow-hidden">
          <div className="grid gap-0 xl:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="px-4 py-4 sm:px-5">
              <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                Analyst snapshot
              </div>

              <div className="mt-4 grid gap-y-3">
                {summaryRows.map((item) => (
                  <div
                    key={item.label}
                    className="grid gap-1 border-b border-border/35 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="text-xs text-muted-foreground">
                      {item.label}
                    </div>
                    <div className="text-base tracking-tight">{item.value}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 border-t border-border/45 pt-4">
                <div className="text-xs text-muted-foreground">Grade mix</div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                  {gradeMix.map(([label, value]) => (
                    <span key={label}>
                      {label}: {value ?? "N/A"}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-border/45 px-4 py-4 sm:px-5 xl:border-t-0 xl:border-l">
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
                <div className="min-w-0">
                  <div className="mb-3 font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                    Forward estimates
                  </div>
                  {street.analystEstimates.length > 0 ? (
                    <div className="market-table-frame">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-background/80 text-left">
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
                          {street.analystEstimates.map(
                            (estimate: AnalystEstimateSnapshot, index: number) => (
                              <tr
                                key={`${estimate.date ?? "estimate"}:${String(index)}`}
                                className="border-b border-border/35 last:border-b-0"
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
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <EmptyState
                      title="No analyst estimates"
                      description="Forward estimate ranges were not returned for this symbol."
                    />
                  )}
                </div>

                {street.ratingsHistory.length > 0 ? (
                  <div className="min-w-0">
                    <div className="mb-3 font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                      Recent ratings
                    </div>
                    <div className="market-table-frame">
                      <table className="min-w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/50 bg-background/80 text-left">
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
                          {street.ratingsHistory.map(
                            (entry: RatingsHistoricalEntry) => (
                              <tr
                                key={`${entry.date ?? "date"}:${entry.rating ?? "rating"}`}
                                className="border-b border-border/35 last:border-b-0"
                              >
                                <td className="px-3 py-2">
                                  {formatDate(entry.date)}
                                </td>
                                <td className="px-3 py-2">
                                  {entry.rating ?? "N/A"}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {entry.overallScore ?? "N/A"}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
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
