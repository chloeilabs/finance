import Link from "next/link"
import { notFound } from "next/navigation"

import {
  CalendarList,
  EmptyState,
  FilingList,
  LockedSectionGrid,
  MetricGrid,
  NewsList,
  PageHeader,
  PriceHistoryChart,
  SectionFrame,
  StatementTables,
  StockHeadline,
} from "@/components/markets/ui/market-primitives"
import { Button } from "@/components/ui/button"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatMetricValue,
} from "@/lib/markets-format"
import { getStockDossier } from "@/lib/server/markets/service"

export default async function StockPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const dossier = await getStockDossier(symbol)

  if (!dossier.profile && !dossier.quote) {
    notFound()
  }

  const profile = dossier.profile
  const quote = dossier.quote
  const analystLocks = dossier.lockedSections.filter(
    (section) => section.title === "Analyst"
  )

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Stock"
        title={profile?.companyName ?? dossier.symbol}
        description={
          profile?.description ??
          "Deep company workspace with cached market, fundamentals, calendar, filings, and premium-gated context."
        }
        actions={
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link
                href={`/copilot?symbol=${encodeURIComponent(dossier.symbol)}`}
              >
                Open Copilot
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

      <SectionFrame
        title="Price history"
        description="End-of-day line chart for the currently available historical window on your active FMP plan."
        aside={dossier.plan.historicalRangeLabel}
      >
        <PriceHistoryChart
          symbol={dossier.symbol}
          points={dossier.chart}
          currency={quote?.currency}
          historicalRangeLabel={dossier.plan.historicalRangeLabel}
        />
      </SectionFrame>

      <SectionFrame
        title="Company summary"
        description="Identity, listing context, and balance-sheet scale before diving into the rest of the dossier."
      >
        <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2 xl:grid-cols-6">
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

      <SectionFrame
        title="Headline metrics"
        description="Cross-cut metrics from key ratios, quality scores, and balance-sheet health."
      >
        <MetricGrid metrics={dossier.headlineStats} />
      </SectionFrame>

      <SectionFrame
        title="Valuation"
        description="Owner earnings and enterprise value summary based on the currently available plan data."
      >
        {dossier.valuation ? (
          <div className="grid gap-px border border-border/70 bg-border/70 md:grid-cols-2 xl:grid-cols-4">
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
                {formatMetricValue(dossier.valuation.ownerEarnings)}
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

      <SectionFrame
        title="Statements"
        description="Recent annual statement snapshots for revenue, profitability, balance-sheet strength, and cash generation."
      >
        <StatementTables tables={dossier.statements} />
      </SectionFrame>

      <SectionFrame
        title="Growth"
        description="Recent year-over-year change points derived from the income statement growth series."
      >
        <MetricGrid metrics={dossier.growth} />
      </SectionFrame>

      <SectionFrame
        title="Catalysts"
        description="Company-specific earnings and dividend events, sorted most recent first."
      >
        <CalendarList events={dossier.calendar} />
      </SectionFrame>

      <SectionFrame
        title="Analyst"
        description="Consensus targets and recent grade changes when the active plan exposes them."
      >
        {dossier.analyst ? (
          <div className="grid gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
            <div className="grid gap-px border border-border/70 bg-border/70">
              <div className="bg-background px-4 py-3">
                <div className="text-xs text-muted-foreground">Consensus</div>
                <div className="mt-2 text-lg tracking-tight">
                  {dossier.analyst.ratingSummary ?? "N/A"}
                </div>
              </div>
              <div className="bg-background px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  Target Range
                </div>
                <div className="mt-2 text-sm">
                  {formatCurrency(dossier.analyst.targetLow)} to{" "}
                  {formatCurrency(dossier.analyst.targetHigh)}
                </div>
              </div>
              <div className="bg-background px-4 py-3">
                <div className="text-xs text-muted-foreground">
                  Consensus Target
                </div>
                <div className="mt-2 text-lg tracking-tight">
                  {formatCurrency(dossier.analyst.targetConsensus)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {dossier.analyst.grades.length > 0 ? (
                dossier.analyst.grades.map((grade, index) => (
                  <div
                    key={[
                      grade.provider ?? "grade",
                      grade.date ?? "date",
                      String(index),
                    ].join(":")}
                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border border-border/70 px-4 py-3"
                  >
                    <div>
                      <div className="font-departureMono text-xs tracking-tight">
                        {grade.provider ?? "Coverage update"}
                      </div>
                      <div className="mt-1 text-sm">{grade.grade ?? "N/A"}</div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(grade.date)}
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="No analyst grades"
                  description="Analyst grades are not available for this symbol or current plan."
                />
              )}
            </div>
          </div>
        ) : analystLocks.length > 0 ? (
          <LockedSectionGrid sections={analystLocks} />
        ) : (
          <EmptyState
            title="No analyst data"
            description="The analyst surface is enabled for this plan, but the upstream feed did not return coverage for this symbol."
          />
        )}
      </SectionFrame>

      <SectionFrame
        title="Filings"
        description="Recent SEC documents sourced through the filings search feed."
      >
        <FilingList items={dossier.filings} />
      </SectionFrame>

      <SectionFrame
        title="News"
        description="Recent company-specific stories from the FMP stock news feed."
      >
        <NewsList stories={dossier.news} />
      </SectionFrame>

      <SectionFrame
        title="Premium context"
        description="Sections that are ready in the shell but intentionally gated by the current FMP plan."
      >
        <LockedSectionGrid sections={dossier.lockedSections} />
      </SectionFrame>
    </div>
  )
}
