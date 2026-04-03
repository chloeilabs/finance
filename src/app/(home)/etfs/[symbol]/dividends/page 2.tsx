import { CalendarList } from "@/components/markets/ui/market-data-lists"
import { MetricGrid, SectionFrame } from "@/components/markets/ui/market-primitives"
import { getEtfDossier } from "@/lib/server/markets/service"

export default async function EtfDividendsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const dossier = await getEtfDossier(symbol)

  const dividendMetrics = [
    {
      label: "Dividend Yield",
      value:
        dossier.dividendSnapshot?.dividendYieldTtm ??
        dossier.info?.dividendYield ??
        null,
    },
    {
      label: "Dividend / Share",
      value:
        dossier.dividendSnapshot?.dividendPerShareTtm ??
        dossier.info?.dividendPerShare ??
        null,
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
      value:
        dossier.dividendSnapshot?.frequency ?? dossier.info?.frequency ?? null,
    },
    {
      label: "Ex-Dividend Date",
      value: dossier.info?.exDividendDate ?? null,
    },
  ]

  return (
    <>
      <SectionFrame title="Dividend Snapshot">
        <MetricGrid metrics={dividendMetrics} />
      </SectionFrame>

      <SectionFrame title="Dividend History">
        <CalendarList events={dossier.dividendHistory} />
      </SectionFrame>
    </>
  )
}
