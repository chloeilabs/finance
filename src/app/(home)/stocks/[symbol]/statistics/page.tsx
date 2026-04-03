import {
  TickerValueTable,
  TickerWidget,
  type TickerWidgetRow,
} from "@/components/markets/ticker/ticker-widgets"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/markets-format"
import { getStockDossier } from "@/lib/server/markets/service"
import { getMetricNumberByLabel } from "@/lib/server/markets/service-support"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"

import { redirectIfEtfSymbol } from "../stock-route-utils"

function getQuoteRange(
  low: number | null | undefined,
  high: number | null | undefined,
  currency?: string | null
) {
  return `${formatCurrency(low, { currency: currency ?? "USD" })} - ${formatCurrency(
    high,
    { currency: currency ?? "USD" }
  )}`
}

function getRecentSplitRows(
  calendar: Awaited<ReturnType<typeof getStockDossier>>["calendar"]
): TickerWidgetRow[] {
  return calendar
    .filter((event) => event.eventType === "split")
    .slice(0, 6)
    .map((event, index) => ({
      label: formatDate(event.eventDate),
      value: event.value ?? event.estimate ?? `Split ${String(index + 1)}`,
    }))
}

export default async function StockStatisticsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "statistics")

  const dossier = await getStockDossier(symbol)
  const quote = dossier.quote
  const currency = quote?.currency ?? "USD"
  const nextEarnings = dossier.calendar.find((event) => event.eventType === "earnings")
  const splitRows = getRecentSplitRows(dossier.calendar)

  const sections: {
    actionHref?: string
    actionLabel?: string
    rows: TickerWidgetRow[]
    title: string
  }[] = [
    {
      rows: [
        {
          label: "Market Cap",
          value: formatCurrency(quote?.marketCap ?? dossier.profile?.marketCap, {
            compact: true,
            currency,
          }),
        },
        {
          label: "Enterprise Value",
          value: formatCurrency(dossier.valuation?.enterpriseValue, {
            compact: true,
            currency,
          }),
        },
        {
          label: "DCF",
          value: formatCurrency(dossier.valuation?.dcf, { currency }),
        },
        {
          label: "Owner Earnings",
          value: formatCurrency(dossier.valuation?.ownerEarnings, {
            compact: true,
            currency,
          }),
        },
      ],
      title: "Total Valuation",
    },
    {
      actionHref: getTickerHref(dossier.symbol, "stock", "profile"),
      actionLabel: "Profile",
      rows: [
        {
          label: "Earnings Date",
          value: formatDate(nextEarnings?.eventDate),
        },
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
          label: "IPO Date",
          value: formatDate(dossier.profile?.ipoDate),
        },
      ],
      title: "Important Dates",
    },
    {
      actionHref: getTickerHref(dossier.symbol, "stock", "profile"),
      actionLabel: "Company",
      rows: [
        {
          label: "Float Shares",
          value: formatCompactNumber(dossier.shareFloat?.floatShares),
        },
        {
          label: "Outstanding Shares",
          value: formatCompactNumber(dossier.shareFloat?.outstandingShares),
        },
        {
          label: "Free Float",
          value: formatPercent(dossier.shareFloat?.freeFloatPercentage),
        },
        {
          label: "Employees",
          value: formatCompactNumber(dossier.profile?.employees),
        },
        {
          label: "Beta",
          value: formatNumber(dossier.profile?.beta, { digits: 2 }),
        },
      ],
      title: "Share Statistics",
    },
    {
      actionHref: getTickerHref(dossier.symbol, "stock", "financials"),
      actionLabel: "Financials",
      rows: [
        {
          label: "P / E",
          value: formatNumber(getMetricNumberByLabel(dossier.ratioMetrics ?? [], "P / E"), {
            digits: 2,
          }),
        },
        {
          label: "P / B",
          value: formatNumber(getMetricNumberByLabel(dossier.ratioMetrics ?? [], "P / B"), {
            digits: 2,
          }),
        },
        {
          label: "EV / EBITDA",
          value: formatNumber(
            getMetricNumberByLabel(dossier.keyMetrics ?? [], "EV / EBITDA"),
            {
              digits: 2,
            }
          ),
        },
        {
          label: "Current Ratio",
          value: formatNumber(
            getMetricNumberByLabel(dossier.keyMetrics ?? [], "Current Ratio"),
            {
              digits: 2,
            }
          ),
        },
        {
          label: "ROE",
          value: formatPercent(
            getMetricNumberByLabel(dossier.keyMetrics ?? [], "ROE"),
            {
              scale: "fraction",
            }
          ),
        },
      ],
      title: "Valuation Ratios",
    },
    {
      actionHref: getTickerHref(dossier.symbol, "stock", "financials"),
      actionLabel: "Statements",
      rows: [
        {
          label: "Working Capital",
          value: formatCurrency(dossier.financialScores?.workingCapital, {
            compact: true,
            currency,
          }),
        },
        {
          label: "Total Assets",
          value: formatCurrency(dossier.financialScores?.totalAssets, {
            compact: true,
            currency,
          }),
        },
        {
          label: "Total Liabilities",
          value: formatCurrency(dossier.financialScores?.totalLiabilities, {
            compact: true,
            currency,
          }),
        },
        {
          label: "Revenue",
          value: formatCurrency(dossier.financialScores?.revenue, {
            compact: true,
            currency,
          }),
        },
        {
          label: "EBIT",
          value: formatCurrency(dossier.financialScores?.ebit, {
            compact: true,
            currency,
          }),
        },
      ],
      title: "Financial Position",
    },
    {
      actionHref: getTickerHref(dossier.symbol, "stock", "metrics"),
      actionLabel: "Metrics",
      rows: [
        {
          label: "Altman Z",
          value: formatNumber(dossier.financialScores?.altmanZScore, {
            digits: 2,
          }),
        },
        {
          label: "Piotroski",
          value: formatNumber(dossier.financialScores?.piotroskiScore, {
            digits: 0,
          }),
        },
        {
          label: "ROIC",
          value: formatPercent(
            getMetricNumberByLabel(dossier.keyMetrics ?? [], "ROIC"),
            {
              scale: "fraction",
            }
          ),
        },
        {
          label: "FCF Yield",
          value: formatPercent(
            getMetricNumberByLabel(dossier.keyMetrics ?? [], "FCF Yield"),
            {
              scale: "fraction",
            }
          ),
        },
        {
          label: "Operating Margin",
          value: formatPercent(
            getMetricNumberByLabel(dossier.ratioMetrics ?? [], "Operating Margin"),
            {
              scale: "fraction",
            }
          ),
        },
      ],
      title: "Financial Efficiency",
    },
    {
      actionHref: getTickerHref(dossier.symbol, "stock", "chart"),
      actionLabel: "Chart",
      rows: [
        {
          label: "Current Price",
          value: formatCurrency(quote?.price, { currency }),
        },
        {
          label: "Day Range",
          value: getQuoteRange(quote?.dayLow, quote?.dayHigh, currency),
        },
        {
          label: "52-Week Range",
          value: getQuoteRange(quote?.yearLow, quote?.yearHigh, currency),
        },
        {
          label: "50-Day Average",
          value: formatCurrency(quote?.priceAvg50, { currency }),
        },
        {
          label: "200-Day Average",
          value: formatCurrency(quote?.priceAvg200, { currency }),
        },
        {
          label: "Volume",
          value: formatCompactNumber(quote?.volume),
        },
        {
          label: "Avg Volume",
          value: formatCompactNumber(quote?.avgVolume),
        },
      ],
      title: "Stock Price Statistics",
    },
    {
      actionHref: getTickerHref(dossier.symbol, "stock", "dividends"),
      actionLabel: "Dividends",
      rows: [
        {
          label: "Dividend / Share",
          value: formatCurrency(dossier.dividendSnapshot?.dividendPerShareTtm, {
            currency,
          }),
        },
        {
          label: "Dividend Yield",
          value: formatPercent(dossier.dividendSnapshot?.dividendYieldTtm, {
            scale: "fraction",
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
          label: "Frequency",
          value: dossier.dividendSnapshot?.frequency ?? "N/A",
        },
      ],
      title: "Dividends & Yields",
    },
    {
      actionHref: getTickerHref(dossier.symbol, "stock", "history"),
      actionLabel: "History",
      rows:
        splitRows.length > 0
          ? splitRows
          : [
              {
                label: "History",
                value: "No split events on record",
              },
            ],
      title: "Stock Splits",
    },
  ]

  return (
    <div className="px-4 pt-6 sm:px-6">
      <div className="grid gap-5 xl:grid-cols-3">
        {sections.map((section) => (
          <TickerWidget
            key={section.title}
            actionHref={section.actionHref}
            actionLabel={section.actionLabel}
            title={section.title}
          >
            <TickerValueTable rows={section.rows} />
          </TickerWidget>
        ))}
      </div>
    </div>
  )
}
