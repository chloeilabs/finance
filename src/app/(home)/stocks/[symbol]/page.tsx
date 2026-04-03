import { TickerOverviewBody } from "@/components/markets/ticker/ticker-overview-body"
import { TickerOverviewHero } from "@/components/markets/ticker/ticker-overview-hero"
import { TickerSummaryTables } from "@/components/markets/ticker/ticker-summary-tables"
import {
  TickerFactGrid,
  TickerMiniBarChart,
  TickerProgressBars,
  TickerWidget,
} from "@/components/markets/ticker/ticker-widgets"
import { CompanyProfileCopy } from "@/components/markets/ui/company-profile-copy"
import { NewsList } from "@/components/markets/ui/market-data-lists"
import { PriceHistoryChart } from "@/components/markets/ui/market-primitives"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatNumber,
  formatPercent,
} from "@/lib/markets-format"
import {
  getStockDossier,
  getStockPriceHistoryIntradayChart,
} from "@/lib/server/markets/service"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"

import { redirectIfEtfSymbol } from "./stock-route-utils"

function getStatementValue(
  tables: Awaited<ReturnType<typeof getStockDossier>>["statements"],
  tableTitle: string,
  rowLabel: string
) {
  const table = tables.find((entry) => entry.title === tableTitle)
  const row = table?.rows.find((entry) => entry.label === rowLabel)
  return row?.values[0] ?? null
}

function getNumericStatementValue(
  tables: Awaited<ReturnType<typeof getStockDossier>>["statements"],
  tableTitle: string,
  rowLabel: string
) {
  const value = getStatementValue(tables, tableTitle, rowLabel)
  return typeof value === "number" ? value : null
}

function getStatementSeries(
  tables: Awaited<ReturnType<typeof getStockDossier>>["statements"],
  tableTitle: string,
  primaryRowLabel: string,
  secondaryRowLabel: string
) {
  const table = tables.find((entry) => entry.title === tableTitle)
  const primaryRow = table?.rows.find(
    (entry) => entry.label === primaryRowLabel
  )
  const secondaryRow = table?.rows.find(
    (entry) => entry.label === secondaryRowLabel
  )

  if (!table || !primaryRow || !secondaryRow) {
    return []
  }

  return table.columns
    .map((column, index) => {
      const labelMatch = /(20\d{2})/.exec(column)

      return {
        label: labelMatch?.[1] ?? column,
        secondaryValue:
          typeof secondaryRow.values[index] === "number"
            ? secondaryRow.values[index]
            : null,
        value:
          typeof primaryRow.values[index] === "number"
            ? primaryRow.values[index]
            : null,
      }
    })
    .slice(0, 4)
    .reverse()
}

function getMetricNumberValue(
  metrics: Awaited<ReturnType<typeof getStockDossier>>["keyMetrics"],
  label: string
) {
  const value = metrics?.find((entry) => entry.label === label)?.value
  return typeof value === "number" ? value : null
}

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

export default async function StockOverviewPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "overview")

  const [dossier, intradayChart] = await Promise.all([
    getStockDossier(symbol),
    getStockPriceHistoryIntradayChart(symbol),
  ])

  const profile = dossier.profile
  const quote = dossier.quote
  const street = dossier.analyst
  const nextEarnings = dossier.calendar.find(
    (item) => item.eventType === "earnings"
  )
  const financialSeries = getStatementSeries(
    dossier.statements,
    "Income Statement",
    "Revenue",
    "Net Income"
  )
  const headquarters = [profile?.city, profile?.state, profile?.country]
    .filter(Boolean)
    .join(", ")

  const leftItems = [
    {
      label: "Market Cap",
      value: formatCurrency(profile?.marketCap ?? quote?.marketCap, {
        compact: true,
      }),
    },
    {
      label: "Revenue (ttm)",
      value: formatCurrency(
        getNumericStatementValue(
          dossier.statements,
          "Income Statement",
          "Revenue"
        ),
        {
          compact: true,
        }
      ),
    },
    {
      label: "Net Income (ttm)",
      value: formatCurrency(
        getNumericStatementValue(
          dossier.statements,
          "Income Statement",
          "Net Income"
        ),
        { compact: true }
      ),
    },
    {
      label: "EPS (ttm)",
      value: formatNumber(
        getNumericStatementValue(dossier.statements, "Income Statement", "EPS"),
        { digits: 2 }
      ),
    },
    {
      label: "Shares Out",
      value: formatCompactNumber(dossier.shareFloat?.outstandingShares),
    },
    {
      label: "PE Ratio",
      value: formatNumber(
        dossier.ratioMetrics?.find((item) => item.label === "P / E")?.value as
          | number
          | null
          | undefined,
        { digits: 2 }
      ),
    },
    {
      label: "Forward PE",
      value: "N/A",
    },
    {
      label: "Dividend",
      value: `${formatCurrency(dossier.dividendSnapshot?.dividendPerShareTtm, {
        currency: quote?.currency ?? "USD",
      })} (${formatPercent(dossier.dividendSnapshot?.dividendYieldTtm, {
        scale: "fraction",
      })})`,
    },
    {
      label: "Ex-Dividend Date",
      value: formatDate(dossier.dividendSnapshot?.latestDividendDate),
    },
    {
      label: "Float Shares",
      value: formatCompactNumber(dossier.shareFloat?.floatShares),
    },
    {
      label: "Free Float",
      value: formatPercent(dossier.shareFloat?.freeFloatPercentage),
    },
    {
      label: "P / B",
      value: formatNumber(getMetricNumberValue(dossier.ratioMetrics, "P / B"), {
        digits: 2,
      }),
    },
    {
      label: "ROIC",
      value: formatPercent(getMetricNumberValue(dossier.keyMetrics, "ROIC"), {
        scale: "fraction",
      }),
    },
    {
      label: "Operating Margin",
      value: formatPercent(
        getMetricNumberValue(dossier.ratioMetrics, "Operating Margin"),
        {
          scale: "fraction",
        }
      ),
    },
  ]

  const previousClose =
    quote?.price != null && quote.change != null
      ? quote.price - quote.change
      : null

  const rightItems = [
    {
      label: "Volume",
      value: formatCompactNumber(quote?.volume),
    },
    {
      label: "Open",
      value: formatCurrency(quote?.open, {
        currency: quote?.currency ?? "USD",
      }),
    },
    {
      label: "Previous Close",
      value: formatCurrency(previousClose, {
        currency: quote?.currency ?? "USD",
      }),
    },
    {
      label: "Day Range",
      value: getQuoteRange(quote?.dayLow, quote?.dayHigh, quote?.currency),
    },
    {
      label: "52-Week Range",
      value: getQuoteRange(quote?.yearLow, quote?.yearHigh, quote?.currency),
    },
    {
      label: "Beta",
      value: formatNumber(profile?.beta, { digits: 2 }),
    },
    {
      label: "Analysts",
      value:
        street?.ratingSummary ?? dossier.gradesConsensus?.consensus ?? "N/A",
    },
    {
      label: "Price Target",
      value: formatCurrency(street?.targetConsensus, {
        currency: quote?.currency ?? "USD",
      }),
    },
    {
      label: "Earnings Date",
      value: formatDate(nextEarnings?.eventDate),
    },
    {
      label: "Avg Volume",
      value: formatCompactNumber(quote?.avgVolume),
    },
    {
      label: "50-Day Avg",
      value: formatCurrency(quote?.priceAvg50, {
        currency: quote?.currency ?? "USD",
      }),
    },
    {
      label: "200-Day Avg",
      value: formatCurrency(quote?.priceAvg200, {
        currency: quote?.currency ?? "USD",
      }),
    },
    {
      label: "YTD Change",
      value: formatPercent(dossier.priceChange?.ytd),
    },
    {
      label: "1Y Change",
      value: formatPercent(dossier.priceChange?.year1),
    },
  ]

  const analystDelta =
    street?.targetConsensus != null && quote?.price != null && quote.price !== 0
      ? (street.targetConsensus - quote.price) / quote.price
      : null
  const analystTone =
    analystDelta == null
      ? undefined
      : analystDelta >= 0
        ? "positive"
        : "negative"
  const analystMix = [
    {
      label: "Strong Buy",
      tone: "positive" as const,
      value: dossier.gradesConsensus?.strongBuy ?? null,
    },
    {
      label: "Buy",
      tone: "positive" as const,
      value: dossier.gradesConsensus?.buy ?? null,
    },
    {
      label: "Hold",
      value: dossier.gradesConsensus?.hold ?? null,
    },
    {
      label: "Sell",
      tone: "negative" as const,
      value: dossier.gradesConsensus?.sell ?? null,
    },
    {
      label: "Strong Sell",
      tone: "negative" as const,
      value: dossier.gradesConsensus?.strongSell ?? null,
    },
  ]

  return (
    <>
      <div className="px-4 pt-6 sm:px-6">
        <TickerOverviewHero
          chart={
            <PriceHistoryChart
              className="h-full"
              compact
              currentPrice={quote?.price ?? null}
              currency={quote?.currency}
              historicalRangeLabel={dossier.plan.historicalRangeLabel}
              intradayPoints={intradayChart}
              points={dossier.chart}
              sessionChange={quote?.change ?? null}
              sessionChangePercent={quote?.changesPercentage ?? null}
              symbol={dossier.symbol}
            />
          }
          summary={
            <TickerSummaryTables
              className="h-full"
              leftItems={leftItems}
              rightItems={rightItems}
            />
          }
        />
      </div>

      <TickerOverviewBody
        aside={
          <div className="space-y-6">
            <TickerWidget
              actionHref={getTickerHref(dossier.symbol, "stock", "profile")}
              actionLabel="Full Profile"
              title={`About ${dossier.symbol}`}
            >
              {profile?.description ? (
                <CompanyProfileCopy
                  collapsible={false}
                  text={profile.description}
                />
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Company profile data is unavailable for this symbol.
                </p>
              )}
              <div className="mt-4">
                <TickerFactGrid
                  items={[
                    {
                      label: "Sector",
                      value: profile?.sector ?? "N/A",
                    },
                    {
                      label: "Industry",
                      value: profile?.industry ?? "N/A",
                    },
                    {
                      label: "CEO",
                      value: profile?.ceo ?? "N/A",
                    },
                    {
                      label: "Headquarters",
                      value: headquarters || "N/A",
                    },
                  ]}
                />
              </div>
              {profile?.website ? (
                <a
                  className="mt-4 inline-flex text-sm text-primary hover:underline"
                  href={profile.website}
                  rel="noreferrer noopener"
                  target="_blank"
                >
                  Company Site
                </a>
              ) : null}
            </TickerWidget>

            <TickerWidget
              actionHref={getTickerHref(dossier.symbol, "stock", "financials")}
              actionLabel="Financials"
              title="Financial Performance"
            >
              <TickerMiniBarChart
                data={financialSeries}
                emptyDescription="Income statement history will appear here when financial statement records are available."
                emptyTitle="No financial history"
                primaryFormatter={(value) =>
                  formatCurrency(value, {
                    compact: true,
                    currency: quote?.currency ?? "USD",
                  })
                }
                primaryLegend="Revenue"
                secondaryFormatter={(value) =>
                  formatCurrency(value, {
                    compact: true,
                    currency: quote?.currency ?? "USD",
                  })
                }
                secondaryLegend="Net Income"
              />
            </TickerWidget>

            <TickerWidget
              actionHref={getTickerHref(dossier.symbol, "stock", "forecast")}
              actionLabel="Forecast"
              title="Analyst Forecast"
            >
              <div className="rounded-none border border-border/45 bg-background/65 px-4 py-4">
                <div className="text-xs text-muted-foreground">
                  Price Target
                </div>
                <div
                  className={
                    analystTone === "positive"
                      ? "mt-2 text-3xl font-semibold tracking-tight text-[color:var(--vesper-teal)]"
                      : analystTone === "negative"
                        ? "mt-2 text-3xl font-semibold tracking-tight text-[color:var(--vesper-orange)]"
                        : "mt-2 text-3xl font-semibold tracking-tight"
                  }
                >
                  {formatCurrency(street?.targetConsensus, {
                    currency: quote?.currency ?? "USD",
                  })}
                </div>
                {analystDelta != null ? (
                  <div
                    className={
                      analystTone === "positive"
                        ? "mt-1 text-sm text-[color:var(--vesper-teal)]"
                        : "mt-1 text-sm text-[color:var(--vesper-orange)]"
                    }
                  >
                    {formatPercent(analystDelta, { scale: "fraction" })}{" "}
                    {analystDelta >= 0 ? "upside" : "downside"}
                  </div>
                ) : null}
                <div className="mt-3 text-sm">
                  Consensus:{" "}
                  {street?.ratingSummary ??
                    dossier.gradesConsensus?.consensus ??
                    "N/A"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Range: {formatCurrency(street?.targetLow)} to{" "}
                  {formatCurrency(street?.targetHigh)}
                </div>
              </div>
              <div className="mt-4">
                <TickerProgressBars items={analystMix} />
              </div>
            </TickerWidget>
          </div>
        }
      >
        <div className="h-full">
          <TickerWidget className="flex h-full flex-col" title="News">
            <div className="flex-1">
              <NewsList stories={dossier.news} />
            </div>
          </TickerWidget>
        </div>
      </TickerOverviewBody>
    </>
  )
}
