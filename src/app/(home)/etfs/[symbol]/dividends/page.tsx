import {
  TickerDividendTable,
  TickerMiniBarChart,
  TickerValueTable,
  TickerWidget,
} from "@/components/markets/ticker/ticker-widgets"
import { NewsList } from "@/components/markets/ui/market-data-lists"
import { formatCurrency, formatDate, formatPercent } from "@/lib/markets-format"
import { getEtfDossier } from "@/lib/server/markets/service"

function buildAnnualDividendSeries(
  events: Awaited<ReturnType<typeof getEtfDossier>>["dividendHistory"]
) {
  const totals = new Map<string, number>()

  for (const event of events) {
    if (!event.eventDate || !event.value) {
      continue
    }

    const parsed = Number(event.value.replace(/[$,\s]/g, ""))

    if (!Number.isFinite(parsed)) {
      continue
    }

    const year = event.eventDate.slice(0, 4)
    totals.set(year, (totals.get(year) ?? 0) + parsed)
  }

  return [...totals.entries()]
    .map(([label, value]) => ({
      label,
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
    .slice(-6)
}

export default async function EtfDividendsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const dossier = await getEtfDossier(symbol)
  const currency = dossier.quote?.currency ?? dossier.info?.currency ?? "USD"
  const annualSeries = buildAnnualDividendSeries(dossier.dividendHistory)

  return (
    <div className="px-4 pt-6 sm:px-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <TickerWidget title="Dividend Information">
            <TickerValueTable
              rows={[
                {
                  label: "Dividend Yield",
                  value: formatPercent(
                    dossier.dividendSnapshot?.dividendYieldTtm ??
                      dossier.info?.dividendYield,
                    {
                      scale: "fraction",
                    }
                  ),
                },
                {
                  label: "Dividend / Share",
                  value: formatCurrency(
                    dossier.dividendSnapshot?.dividendPerShareTtm ??
                      dossier.info?.dividendPerShare,
                    {
                      currency,
                    }
                  ),
                },
                {
                  label: "Latest Dividend",
                  value: formatCurrency(dossier.dividendSnapshot?.latestDividendPerShare, {
                    currency,
                  }),
                },
                {
                  label: "Latest Yield",
                  value: formatPercent(dossier.dividendSnapshot?.latestDividendYield, {
                    scale: "fraction",
                  }),
                },
                {
                  label: "Payout Frequency",
                  value:
                    dossier.dividendSnapshot?.frequency ?? dossier.info?.frequency ?? "N/A",
                },
                {
                  label: "Ex-Dividend Date",
                  value: formatDate(dossier.info?.exDividendDate),
                },
              ]}
            />
          </TickerWidget>

          <TickerWidget title="Dividend History">
            <TickerDividendTable currency={currency} rows={dossier.dividendHistory} />
          </TickerWidget>

          <TickerWidget title="Annual Distribution Trend">
            <TickerMiniBarChart
              data={annualSeries}
              emptyDescription="Annual distributions will appear here when enough ETF dividend history is available."
              emptyTitle="No annual trend"
              primaryFormatter={(value) => formatCurrency(value, { currency })}
              primaryLegend="Annual Dividend"
            />
          </TickerWidget>
        </div>

        <div className="space-y-6">
          <TickerWidget title="Key Dates">
            <TickerValueTable
              rows={[
                {
                  label: "Ex-Dividend Date",
                  value: formatDate(dossier.info?.exDividendDate),
                },
                {
                  label: "Record Date",
                  value: formatDate(dossier.dividendSnapshot?.latestRecordDate),
                },
                {
                  label: "Payment Date",
                  value: formatDate(dossier.dividendSnapshot?.latestPaymentDate),
                },
                {
                  label: "Frequency",
                  value:
                    dossier.dividendSnapshot?.frequency ?? dossier.info?.frequency ?? "N/A",
                },
              ]}
            />
          </TickerWidget>

          <TickerWidget title="News">
            <NewsList stories={dossier.news} />
          </TickerWidget>
        </div>
      </div>
    </div>
  )
}
