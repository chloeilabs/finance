import { notFound } from "next/navigation"
import { Suspense } from "react"

import {
  SectionLoadingState,
  StockBusinessMixSection,
  StockCatalystsSection,
  StockFinancialSection,
  StockPeersSection,
  StockQualitySection,
  StockSectionNav,
  StockStreetViewSection,
  StockTradingSection,
} from "@/components/markets/stocks/stock-detail-sections"
import { CompanyProfileCopy } from "@/components/markets/ui/company-profile-copy"
import {
  PriceHistoryChart,
  SectionFrame,
  StockHeadline,
} from "@/components/markets/ui/market-primitives"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatLabeledMetricValue,
  formatNumber,
} from "@/lib/markets-format"
import {
  getStockDossierOverview,
  getStockPriceHistoryIntradayChart,
} from "@/lib/server/markets/service"

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const [dossier, intradayChart] = await Promise.all([
    getStockDossierOverview(symbol),
    getStockPriceHistoryIntradayChart(symbol),
  ])

  if (!dossier.profile && !dossier.quote) {
    notFound()
  }

  const profile = dossier.profile
  const quote = dossier.quote
  const headquarters = [profile?.city, profile?.state, profile?.country]
    .filter(Boolean)
    .join(", ")
  const companyFacts = [
    {
      label: "CEO",
      value: profile?.ceo ?? "N/A",
    },
    {
      label: "Headquarters",
      value: headquarters || "N/A",
    },
    {
      label: "Market cap",
      value: formatCurrency(profile?.marketCap ?? quote?.marketCap, {
        compact: true,
      }),
    },
    {
      label: "Employees",
      value: formatCompactNumber(profile?.employees),
    },
    {
      label: "IPO date",
      value: formatDate(profile?.ipoDate),
    },
    {
      label: "Beta",
      value: formatNumber(profile?.beta, { digits: 2 }),
    },
  ]
  const valuationItems = [
    {
      label: "DCF",
      value: formatCurrency(dossier.valuation?.dcf),
    },
    {
      label: "Market cap",
      value: formatCurrency(dossier.valuation?.marketCap, { compact: true }),
    },
    {
      label: "Enterprise value",
      value: formatCurrency(dossier.valuation?.enterpriseValue, {
        compact: true,
      }),
    },
    {
      label: "Owner earnings",
      value: formatCurrency(dossier.valuation?.ownerEarnings, {
        compact: true,
      }),
    },
  ]

  return (
    <div className="pb-10">
      <div id="summary" className="px-4 pt-4 sm:px-6 sm:pt-5">
        <StockHeadline
          change={quote?.change ?? null}
          changesPercentage={quote?.changesPercentage ?? null}
          currency={quote?.currency}
          exchange={profile?.exchangeShortName ?? quote?.exchange ?? null}
          industry={profile?.industry ?? null}
          name={profile?.companyName ?? quote?.name ?? null}
          price={quote?.price ?? null}
          sector={profile?.sector ?? null}
          symbol={dossier.symbol}
          website={profile?.website ?? null}
        />
      </div>

      <StockSectionNav />

      <SectionFrame
        title="Price history"
        aside={dossier.plan.historicalRangeLabel}
      >
        <PriceHistoryChart
          currentPrice={quote?.price ?? null}
          currency={quote?.currency}
          historicalRangeLabel={dossier.plan.historicalRangeLabel}
          intradayPoints={intradayChart}
          points={dossier.chart}
          sessionChange={quote?.change ?? null}
          sessionChangePercent={quote?.changesPercentage ?? null}
          symbol={dossier.symbol}
        />
      </SectionFrame>

      <SectionFrame
        title="Overview"
        description="Company profile, key metrics, and valuation in one place."
      >
        <div className="market-soft-surface overflow-hidden">
          <div className="grid gap-0 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_18rem]">
            <div className="px-4 py-4 sm:px-5">
              <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                Company profile
              </div>
              {profile?.description ? (
                <CompanyProfileCopy text={profile.description} />
              ) : (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  Listed on{" "}
                  {profile?.exchangeShortName ?? quote?.exchange ?? "N/A"} in{" "}
                  {quote?.currency ?? "USD"}, with sector and management details
                  organized below.
                </p>
              )}

              <div className="mt-5 grid gap-x-6 gap-y-4 sm:grid-cols-2">
                {companyFacts.map((fact) => (
                  <div key={fact.label} className="min-w-0">
                    <div className="text-xs text-muted-foreground">
                      {fact.label}
                    </div>
                    <div className="mt-1.5 text-sm tracking-tight">
                      {fact.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-border/45 px-4 py-4 sm:px-5 lg:border-t-0 lg:border-l">
              <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                Key metrics
              </div>

              {dossier.headlineStats.length > 0 ? (
                <div className="mt-4 grid gap-y-3">
                  {dossier.headlineStats.map((metric, index) => (
                    <div
                      key={[
                        metric.label,
                        String(metric.value),
                        String(index),
                      ].join(":")}
                      className="grid gap-1 border-b border-border/35 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end sm:gap-3"
                    >
                      <div className="text-xs text-muted-foreground">
                        {metric.label}
                      </div>
                      <div className="text-base tracking-tight sm:text-right">
                        {formatLabeledMetricValue(metric.label, metric.value)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 text-sm text-muted-foreground">
                  No metrics available
                </div>
              )}
            </div>

            <div className="border-t border-border/45 px-4 py-4 sm:px-5 lg:col-span-2 xl:col-span-1 xl:border-t-0 xl:border-l">
              <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
                Valuation
              </div>
              <div className="mt-2 text-xs leading-5 text-muted-foreground">
                Reference snapshot from cached valuation endpoints.
              </div>

              {dossier.valuation ? (
                <div className="mt-4 grid gap-y-3">
                  {valuationItems.map((item) => (
                    <div
                      key={item.label}
                      className="grid gap-1 border-b border-border/35 pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="text-xs text-muted-foreground">
                        {item.label}
                      </div>
                      <div className="text-lg tracking-tight">{item.value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground">
                    No valuation snapshot
                  </div>
                  <p className="mt-1 leading-6">
                    Valuation data will appear here when the upstream valuation
                    endpoints are available.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SectionFrame>

      <Suspense fallback={<SectionLoadingState title="Trading" />}>
        <StockTradingSection
          currency={quote?.currency}
          symbol={dossier.symbol}
        />
      </Suspense>

      <Suspense fallback={<SectionLoadingState title="Street View" />}>
        <StockStreetViewSection symbol={dossier.symbol} />
      </Suspense>

      <Suspense fallback={<SectionLoadingState title="Quality" />}>
        <StockQualitySection symbol={dossier.symbol} />
      </Suspense>

      <Suspense fallback={<SectionLoadingState title="Financials" />}>
        <StockFinancialSection symbol={dossier.symbol} />
      </Suspense>

      <Suspense fallback={<SectionLoadingState title="Business Mix" />}>
        <StockBusinessMixSection symbol={dossier.symbol} />
      </Suspense>

      <Suspense fallback={<SectionLoadingState title="Peers" />}>
        <StockPeersSection symbol={dossier.symbol} />
      </Suspense>

      <Suspense fallback={<SectionLoadingState title="Catalysts" />}>
        <StockCatalystsSection symbol={dossier.symbol} />
      </Suspense>
    </div>
  )
}
