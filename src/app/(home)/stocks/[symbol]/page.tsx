import Link from "next/link"
import { notFound } from "next/navigation"
import { Suspense } from "react"

import {
  SectionLoadingState,
  StockBusinessMixSection,
  StockCatalystsSection,
  StockFinancialSection,
  StockPeersSection,
  StockPlanLimitsSection,
  StockQualitySection,
  StockSectionNav,
  StockStreetViewSection,
  StockTradingSection,
} from "@/components/markets/stocks/stock-detail-sections"
import {
  EmptyState,
  MetricGrid,
  PageHeader,
  PriceHistoryChart,
  SectionFrame,
  StockHeadline,
} from "@/components/markets/ui/market-primitives"
import { Button } from "@/components/ui/button"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
} from "@/lib/markets-format"
import { getStockDossierOverview } from "@/lib/server/markets/service"

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const dossier = await getStockDossierOverview(symbol)

  if (!dossier.profile && !dossier.quote) {
    notFound()
  }

  const profile = dossier.profile
  const quote = dossier.quote

  return (
    <div className="pb-10">
      <div id="summary">
        <PageHeader
          eyebrow="Stock"
          title={profile?.companyName ?? dossier.symbol}
          actions={
            <div className="flex gap-2">
              <Button asChild size="sm" variant="outline">
                <Link
                  href={`/compare?symbols=${encodeURIComponent(dossier.symbol)}`}
                >
                  Compare
                </Link>
              </Button>
              {profile?.website ? (
                <Button asChild size="sm" variant="outline">
                  <a
                    href={profile.website}
                    rel="noreferrer noopener"
                    target="_blank"
                  >
                    Company Site
                  </a>
                </Button>
              ) : null}
            </div>
          }
        />
      </div>

      <div className="px-4 py-4 sm:px-6">
        <StockHeadline
          change={quote?.change ?? null}
          changesPercentage={quote?.changesPercentage ?? null}
          currency={quote?.currency}
          name={profile?.companyName ?? quote?.name ?? null}
          price={quote?.price ?? null}
          symbol={dossier.symbol}
        />
      </div>

      <StockSectionNav />

      <SectionFrame
        title="Price history"
        aside={dossier.plan.historicalRangeLabel}
      >
        <PriceHistoryChart
          currency={quote?.currency}
          historicalRangeLabel={dossier.plan.historicalRangeLabel}
          points={dossier.chart}
          symbol={dossier.symbol}
        />
      </SectionFrame>

      <SectionFrame title="Company summary">
        <div className="market-grid-6 grid gap-px border border-border/70 bg-border/70">
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Exchange</div>
            <div className="mt-2 text-sm">
              {profile?.exchangeShortName ?? quote?.exchange ?? "N/A"}
            </div>
          </div>
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Sector</div>
            <div className="mt-2 text-sm">{profile?.sector ?? "N/A"}</div>
          </div>
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Industry</div>
            <div className="mt-2 text-sm">{profile?.industry ?? "N/A"}</div>
          </div>
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Market Cap</div>
            <div className="mt-2 text-sm">
              {formatCurrency(profile?.marketCap ?? quote?.marketCap, {
                compact: true,
              })}
            </div>
          </div>
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">Employees</div>
            <div className="mt-2 text-sm">
              {formatCompactNumber(profile?.employees)}
            </div>
          </div>
          <div className="bg-background px-4 py-3">
            <div className="text-xs text-muted-foreground">IPO Date</div>
            <div className="mt-2 text-sm">{formatDate(profile?.ipoDate)}</div>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame title="Headline metrics">
        <MetricGrid metrics={dossier.headlineStats} />
      </SectionFrame>

      <SectionFrame title="Valuation">
        {dossier.valuation ? (
          <div className="market-grid-4 grid gap-px border border-border/70 bg-border/70">
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">DCF</div>
              <div className="mt-2 text-lg tracking-tight">
                {formatCurrency(dossier.valuation.dcf)}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">Market Cap</div>
              <div className="mt-2 text-lg tracking-tight">
                {formatCurrency(dossier.valuation.marketCap, { compact: true })}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Enterprise Value
              </div>
              <div className="mt-2 text-lg tracking-tight">
                {formatCurrency(dossier.valuation.enterpriseValue, {
                  compact: true,
                })}
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <div className="text-xs text-muted-foreground">
                Owner Earnings
              </div>
              <div className="mt-2 text-lg tracking-tight">
                {formatCurrency(dossier.valuation.ownerEarnings, {
                  compact: true,
                })}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No valuation snapshot"
            description="Valuation data will appear here when the upstream valuation endpoints are available."
          />
        )}
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

      <StockPlanLimitsSection sections={dossier.lockedSections} />
    </div>
  )
}
