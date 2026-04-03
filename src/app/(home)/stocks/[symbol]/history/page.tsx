import { TickerHistoryTable } from "@/components/markets/ticker/ticker-history-table"
import { SectionFrame } from "@/components/markets/ui/market-primitives"
import {
  getHistoricalPriceRowsForSymbol,
  getStockDossierOverview,
} from "@/lib/server/markets/service"

import { redirectIfEtfSymbol } from "../stock-route-utils"

export default async function StockHistoryPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "history")

  const [overview, rows] = await Promise.all([
    getStockDossierOverview(symbol),
    getHistoricalPriceRowsForSymbol(symbol, { limit: 260 }),
  ])

  return (
    <SectionFrame title="Price History">
      <TickerHistoryTable currency={overview.quote?.currency} rows={rows} />
    </SectionFrame>
  )
}
