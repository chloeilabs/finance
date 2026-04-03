import {
  TickerDividendTable,
  TickerMiniBarChart,
  TickerValueTable,
  TickerWidget,
} from "@/components/markets/ticker/ticker-widgets"
import { NewsList } from "@/components/markets/ui/market-data-lists"
import { formatCurrency, formatDate, formatPercent } from "@/lib/markets-format"
import { getStockDossier } from "@/lib/server/markets/service"

import { redirectIfEtfSymbol } from "../stock-route-utils"

function buildAnnualDividendSeries(
  events: Awaited<ReturnType<typeof getStockDossier>>["calendar"]
) {
  const totals = new Map<string, number>()

  for (const event of events) {
    if (event.eventType !== "dividend" || !event.eventDate || !event.value) {
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

export default async function StockDividendsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "dividends")

  const dossier = await getStockDossier(symbol)
  const currency = dossier.quote?.currency ?? "USD"
  const dividendEvents = dossier.calendar.filter((event) => event.eventType === "dividend")
  const annualSeries = buildAnnualDividendSeries(dossier.calendar)

  return (
    <div className="px-4 pt-6 sm:px-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <TickerWidget title="Dividend Information">
            <TickerValueTable
              rows={[
                {
                  label: "Dividend Yield",
                  value: formatPercent(dossier.dividendSnapshot?.dividendYieldTtm, {
                    scale: "fraction",
                  }),
                },
                {
                  label: "Dividend / Share",
                  value: formatCurrency(dossier.dividendSnapshot?.dividendPerShareTtm, {
                    currency,
                  }),
                },
                {
                  label: "Payout Ratio",
                  value: formatPercent(dossier.dividendSnapshot?.dividendPayoutRatioTtm, {
                    scale: "fraction",
                  }),
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
                  value: dossier.dividendSnapshot?.frequency ?? "N/A",
                },
              ]}
            />
          </TickerWidget>

          <TickerWidget title="Dividend History">
            <TickerDividendTable currency={currency} rows={dividendEvents} />
          </TickerWidget>

          <TickerWidget title="Annual Dividend Trend">
            <TickerMiniBarChart
              data={annualSeries}
              emptyDescription="Annual dividend totals will appear here when enough distribution history is available."
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
                  value: formatDate(dossier.dividendSnapshot?.latestDividendDate),
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
                  label: "Declaration Date",
                  value: formatDate(dossier.dividendSnapshot?.latestDeclarationDate),
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
