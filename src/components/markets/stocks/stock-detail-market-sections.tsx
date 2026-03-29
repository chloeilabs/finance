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
        <div className="market-split-18 grid gap-3">
          <div className="market-panel-list">
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">Consensus</div>
              <div className="mt-2 text-lg tracking-tight">
                {street.analyst?.ratingSummary ??
                  street.gradesConsensus?.consensus ??
                  "N/A"}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">Target Range</div>
              <div className="mt-2 text-sm">
                {formatCurrency(street.analyst?.targetLow)} to{" "}
                {formatCurrency(street.analyst?.targetHigh)}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">
                Consensus Target
              </div>
              <div className="mt-2 text-lg tracking-tight">
                {formatCurrency(street.analyst?.targetConsensus)}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
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

            {street.ratingsHistory.length > 0 ? (
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
                          <td className="px-3 py-2">{formatDate(entry.date)}</td>
                          <td className="px-3 py-2">{entry.rating ?? "N/A"}</td>
                          <td className="px-3 py-2 text-right">
                            {entry.overallScore ?? "N/A"}
                          </td>
                        </tr>
                      )
                    )}
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
