import { CalendarList } from "@/components/markets/ui/market-data-lists"
import { MetricGrid, SectionFrame } from "@/components/markets/ui/market-primitives"
import { getStockDossier } from "@/lib/server/markets/service"
import { getMetricNumberByLabel } from "@/lib/server/markets/service-support"

import { redirectIfEtfSymbol } from "../stock-route-utils"

export default async function StockStatisticsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "statistics")

  const dossier = await getStockDossier(symbol)

  const tradingMetrics = [
    {
      label: "Market Cap",
      value: dossier.quote?.marketCap ?? dossier.profile?.marketCap ?? null,
    },
    { label: "Volume", value: dossier.quote?.volume ?? null },
    { label: "Avg Volume", value: dossier.quote?.avgVolume ?? null },
    { label: "50-Day Avg", value: dossier.quote?.priceAvg50 ?? null },
    { label: "200-Day Avg", value: dossier.quote?.priceAvg200 ?? null },
    {
      label: "P / E",
      value: getMetricNumberByLabel(dossier.ratioMetrics ?? [], "P / E"),
    },
    {
      label: "P / B",
      value: getMetricNumberByLabel(dossier.ratioMetrics ?? [], "P / B"),
    },
    { label: "Beta", value: dossier.profile?.beta ?? null },
  ]

  const qualityMetrics = dossier.financialScores
    ? [
        { label: "Altman Z", value: dossier.financialScores.altmanZScore },
        { label: "Piotroski", value: dossier.financialScores.piotroskiScore },
        { label: "Working Capital", value: dossier.financialScores.workingCapital },
        { label: "Total Assets", value: dossier.financialScores.totalAssets },
        { label: "Total Liabilities", value: dossier.financialScores.totalLiabilities },
        { label: "Revenue", value: dossier.financialScores.revenue },
      ]
    : []

  const capitalMetrics = [
    { label: "Float Shares", value: dossier.shareFloat?.floatShares ?? null },
    {
      label: "Outstanding Shares",
      value: dossier.shareFloat?.outstandingShares ?? null,
    },
    {
      label: "Free Float",
      value: dossier.shareFloat?.freeFloatPercentage ?? null,
    },
    { label: "DCF", value: dossier.valuation?.dcf ?? null },
    { label: "Owner Earnings", value: dossier.valuation?.ownerEarnings ?? null },
    {
      label: "Target Consensus",
      value: dossier.analyst?.targetConsensus ?? null,
    },
    {
      label: "Dividend Yield",
      value: dossier.dividendSnapshot?.dividendYieldTtm ?? null,
    },
    {
      label: "Payout Ratio",
      value: dossier.dividendSnapshot?.dividendPayoutRatioTtm ?? null,
    },
  ]

  return (
    <>
      <SectionFrame title="Trading + Valuation">
        <MetricGrid metrics={tradingMetrics} />
      </SectionFrame>

      <SectionFrame title="Quality Scorecard">
        <MetricGrid metrics={qualityMetrics} />
      </SectionFrame>

      <SectionFrame title="Capital Structure">
        <MetricGrid metrics={capitalMetrics} />
      </SectionFrame>

      <SectionFrame title="Dividend + Split Events">
        <CalendarList
          events={dossier.calendar.filter(
            (event) =>
              event.eventType === "dividend" || event.eventType === "split"
          )}
        />
      </SectionFrame>
    </>
  )
}
