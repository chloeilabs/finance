import { PriceHistoryChart, SectionFrame } from "@/components/markets/ui/market-primitives"
import { getEtfDossier } from "@/lib/server/markets/service"

export default async function EtfChartPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const dossier = await getEtfDossier(symbol)

  return (
    <SectionFrame title="Chart Workspace" aside={dossier.plan.historicalRangeLabel}>
      <PriceHistoryChart
        currentPrice={dossier.quote?.price ?? null}
        currency={dossier.info?.currency ?? dossier.quote?.currency}
        historicalRangeLabel={dossier.plan.historicalRangeLabel}
        intradayPoints={dossier.intradayCharts["5min"]}
        points={dossier.chart}
        sessionChange={dossier.quote?.change ?? null}
        sessionChangePercent={dossier.quote?.changesPercentage ?? null}
        symbol={dossier.symbol}
      />
    </SectionFrame>
  )
}
