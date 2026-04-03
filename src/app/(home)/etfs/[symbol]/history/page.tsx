import { TickerHistoryTable } from "@/components/markets/ticker/ticker-history-table"
import { SectionFrame } from "@/components/markets/ui/market-primitives"
import {
  getEtfDossier,
  getHistoricalPriceRowsForSymbol,
} from "@/lib/server/markets/service"

export default async function EtfHistoryPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const [dossier, rows] = await Promise.all([
    getEtfDossier(symbol),
    getHistoricalPriceRowsForSymbol(symbol, { limit: 260 }),
  ])

  return (
    <SectionFrame title="Price History">
      <TickerHistoryTable
        currency={dossier.info?.currency ?? dossier.quote?.currency}
        rows={rows}
      />
    </SectionFrame>
  )
}
