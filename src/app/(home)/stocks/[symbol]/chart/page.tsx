import { StockTradingSection } from "@/components/markets/stocks/stock-detail-sections"
import { PriceHistoryChart, SectionFrame } from "@/components/markets/ui/market-primitives"
import {
  getStockDossierOverview,
  getStockPriceHistoryIntradayChart,
} from "@/lib/server/markets/service"

import { redirectIfEtfSymbol } from "../stock-route-utils"

export default async function StockChartPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "chart")

  const [overview, intradayChart] = await Promise.all([
    getStockDossierOverview(symbol),
    getStockPriceHistoryIntradayChart(symbol),
  ])

  return (
    <>
      <SectionFrame title="Chart Workspace" aside={overview.plan.historicalRangeLabel}>
        <PriceHistoryChart
          currentPrice={overview.quote?.price ?? null}
          currency={overview.quote?.currency}
          historicalRangeLabel={overview.plan.historicalRangeLabel}
          intradayPoints={intradayChart}
          points={overview.chart}
          sessionChange={overview.quote?.change ?? null}
          sessionChangePercent={overview.quote?.changesPercentage ?? null}
          symbol={overview.symbol}
        />
      </SectionFrame>

      <StockTradingSection
        currency={overview.quote?.currency}
        symbol={overview.symbol}
      />
    </>
  )
}
