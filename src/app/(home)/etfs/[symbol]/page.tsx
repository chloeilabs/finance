import { TickerOverviewBody } from "@/components/markets/ticker/ticker-overview-body"
import { TickerOverviewHero } from "@/components/markets/ticker/ticker-overview-hero"
import { TickerSummaryTables } from "@/components/markets/ticker/ticker-summary-tables"
import {
  TickerDividendTable,
  TickerFactGrid,
  TickerValueTable,
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
import { getEtfDossier } from "@/lib/server/markets/service"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"

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

export default async function EtfOverviewPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const dossier = await getEtfDossier(symbol)

  const info = dossier.info
  const quote = dossier.quote
  const previousClose =
    quote?.price != null && quote.change != null ? quote.price - quote.change : null

  const leftItems = [
    {
      label: "Assets",
      value: formatCurrency(info?.assets, { compact: true }),
    },
    {
      label: "Expense Ratio",
      value: formatPercent(info?.expenseRatio, { scale: "fraction" }),
    },
    {
      label: "PE Ratio",
      value: formatNumber(info?.peRatio, { digits: 2 }),
    },
    {
      label: "Shares Out",
      value: formatCompactNumber(info?.sharesOutstanding),
    },
    {
      label: "Dividend (ttm)",
      value: formatCurrency(info?.dividendPerShare, { currency: quote?.currency ?? "USD" }),
    },
    {
      label: "Dividend Yield",
      value: formatPercent(info?.dividendYield, { scale: "fraction" }),
    },
    {
      label: "Ex-Dividend Date",
      value: formatDate(info?.exDividendDate),
    },
    {
      label: "Payout Frequency",
      value: info?.frequency ?? "N/A",
    },
  ]

  const rightItems = [
    {
      label: "Volume",
      value: formatCompactNumber(quote?.volume),
    },
    {
      label: "Open",
      value: formatCurrency(quote?.open, { currency: quote?.currency ?? "USD" }),
    },
    {
      label: "Previous Close",
      value: formatCurrency(previousClose, { currency: quote?.currency ?? "USD" }),
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
      value: formatNumber(info?.beta, { digits: 2 }),
    },
    {
      label: "Holdings",
      value: formatCompactNumber(info?.totalHoldings ?? dossier.holdings.length),
    },
    {
      label: "Inception Date",
      value: formatDate(info?.inceptionDate),
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
              intradayPoints={dossier.intradayCharts["5min"]}
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
              actionHref={getTickerHref(dossier.symbol, "etf", "holdings")}
              actionLabel="Holdings"
              title={`About ${dossier.symbol}`}
            >
              {info?.description ? (
                <CompanyProfileCopy text={info.description} />
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  ETF profile coverage is unavailable for this symbol.
                </p>
              )}
              <div className="mt-4">
                <TickerFactGrid
                  items={[
                    {
                      label: "Provider",
                      value: info?.provider ?? "N/A",
                    },
                    {
                      label: "Asset Class",
                      value: info?.assetClass ?? "N/A",
                    },
                    {
                      label: "Category",
                      value: info?.category ?? "N/A",
                    },
                    {
                      label: "Region",
                      value: info?.region ?? "N/A",
                    },
                    {
                      label: "Index Tracked",
                      value: info?.indexTracked ?? "N/A",
                    },
                    {
                      label: "Domicile",
                      value: info?.domicile ?? "N/A",
                    },
                  ]}
                />
              </div>
            </TickerWidget>

            <TickerWidget
              actionHref={getTickerHref(dossier.symbol, "etf", "holdings")}
              actionLabel="View All"
              title="Top Holdings"
            >
              <TickerValueTable
                rows={dossier.holdings.slice(0, 10).map((holding) => ({
                  label: holding.symbol ?? "Holding",
                  value: (
                    <span className="inline-flex items-center gap-2">
                      <span className="hidden text-muted-foreground sm:inline">
                        {holding.name ?? "Holding"}
                      </span>
                      <span>
                        {formatPercent(holding.weightPercentage, {
                          scale: "fraction",
                        })}
                      </span>
                    </span>
                  ),
                }))}
              />
            </TickerWidget>

            <TickerWidget
              actionHref={getTickerHref(dossier.symbol, "etf", "dividends")}
              actionLabel="Dividend History"
              title="Dividends"
            >
              <TickerDividendTable
                currency={quote?.currency}
                rows={dossier.dividendHistory.slice(0, 5)}
              />
            </TickerWidget>
          </div>
        }
      >
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight">News</h2>
          <NewsList stories={dossier.news} />
        </div>
      </TickerOverviewBody>
    </>
  )
}
