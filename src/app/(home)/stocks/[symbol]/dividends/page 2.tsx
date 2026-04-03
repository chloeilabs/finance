import { CalendarList } from "@/components/markets/ui/market-data-lists"
import { MetricGrid, SectionFrame } from "@/components/markets/ui/market-primitives"
import { getStockDossier } from "@/lib/server/markets/service"

import { redirectIfEtfSymbol } from "../stock-route-utils"

export default async function StockDividendsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "dividends")

  const dossier = await getStockDossier(symbol)

  const dividendMetrics = [
    {
      label: "Dividend Yield",
      value: dossier.dividendSnapshot?.dividendYieldTtm ?? null,
    },
    {
      label: "Dividend / Share",
      value: dossier.dividendSnapshot?.dividendPerShareTtm ?? null,
    },
    {
      label: "Payout Ratio",
      value: dossier.dividendSnapshot?.dividendPayoutRatioTtm ?? null,
    },
    {
      label: "Latest Dividend",
      value: dossier.dividendSnapshot?.latestDividendPerShare ?? null,
    },
    {
      label: "Latest Yield",
      value: dossier.dividendSnapshot?.latestDividendYield ?? null,
    },
    {
      label: "Payout Frequency",
      value: dossier.dividendSnapshot?.frequency ?? null,
    },
  ]

  return (
    <>
      <SectionFrame title="Dividend Snapshot">
        <MetricGrid metrics={dividendMetrics} />
      </SectionFrame>

      <SectionFrame title="Dividend Calendar">
        <CalendarList
          events={dossier.calendar.filter((event) => event.eventType === "dividend")}
        />
      </SectionFrame>
    </>
  )
}
