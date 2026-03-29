import Link from "next/link"

import {
  CalendarList,
  EmptyState,
  FilingList,
  MetricGrid,
  NewsList,
  SectionFrame,
  StatementTables,
} from "@/components/markets/ui/market-primitives"
import { Sparkline } from "@/components/markets/ui/sparkline"
import {
  formatCurrency,
  formatLabeledMetricValue,
  formatMetricValue,
} from "@/lib/markets-format"
import type { LockedMarketSection } from "@/lib/shared/markets/intelligence"

import { SegmentationBlock } from "./stock-detail-common"
import {
  getBusinessSection,
  getContextSection,
  getFinancialSection,
} from "./stock-detail-data"

export async function StockFinancialSection({ symbol }: { symbol: string }) {
  const financial = await getFinancialSection(symbol)

  return (
    <div id="financials">
      <SectionFrame title="Statements">
        <StatementTables tables={financial.statements} />
      </SectionFrame>

      <SectionFrame title="Growth">
        <MetricGrid metrics={financial.growth} />
      </SectionFrame>
    </div>
  )
}

export async function StockBusinessMixSection({ symbol }: { symbol: string }) {
  const business = await getBusinessSection(symbol)

  return (
    <div id="business-mix">
      <SectionFrame title="Business Mix">
        <div className="market-grid-2 grid gap-4">
          <SegmentationBlock
            segmentation={business.productSegments}
            title="Product Mix"
          />
          <SegmentationBlock
            segmentation={business.geographicSegments}
            title="Geographic Mix"
          />
        </div>

        <div className="market-split-20 grid gap-3">
          <div className="market-soft-surface px-4 py-4">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Market Cap History
            </div>
            <Sparkline
              className="mt-5 h-20"
              values={business.marketCapHistory.map((item) => item.marketCap)}
            />
          </div>
          <div className="market-soft-surface px-4 py-4">
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              Employee History
            </div>
            <Sparkline
              className="mt-5 h-20"
              values={business.employeeHistory.map(
                (item) => item.employeeCount
              )}
            />
          </div>
          <div className="market-panel-list">
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">Registrant</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.registrantName ?? "N/A"}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">CIK</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.cik ?? "N/A"}
              </div>
            </div>
            <div className="market-panel-tile px-3 py-2.5 sm:px-4">
              <div className="text-xs text-muted-foreground">SIC</div>
              <div className="mt-2 text-sm">
                {business.secProfile?.sicCode ?? "N/A"}{" "}
                {business.secProfile?.sicDescription ?? ""}
              </div>
            </div>
          </div>
        </div>
      </SectionFrame>
    </div>
  )
}

export async function StockPeersSection({ symbol }: { symbol: string }) {
  const business = await getBusinessSection(symbol)

  return (
    <div id="peers">
      <SectionFrame title="Peers">
        {business.peers.length > 0 ? (
          <div className="market-table-frame">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-background/80 text-left">
                  <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                    Symbol
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Price
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    P/E
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    FCF Yield
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    ROIC
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Piotroski
                  </th>
                </tr>
              </thead>
              <tbody>
                {business.peers.map((peer) => (
                  <tr
                    key={peer.symbol}
                    className="border-b border-border/35 last:border-b-0"
                  >
                    <td className="px-3 py-3">
                      <div>
                        <Link
                          className="font-departureMono text-sm tracking-tight hover:underline"
                          href={`/stocks/${encodeURIComponent(peer.symbol)}`}
                        >
                          {peer.symbol}
                        </Link>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {peer.companyName ?? "Peer company"}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(peer.price)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMetricValue(peer.peRatio)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatLabeledMetricValue("FCF Yield", peer.fcfYield)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatLabeledMetricValue("ROIC", peer.roic)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMetricValue(peer.piotroskiScore)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No peer set"
            description="Peer comparison is unavailable for this symbol."
          />
        )}
      </SectionFrame>
    </div>
  )
}

export async function StockCatalystsSection({ symbol }: { symbol: string }) {
  const context = await getContextSection(symbol)

  return (
    <div id="catalysts">
      <SectionFrame title="Catalysts">
        <CalendarList events={context.calendar} />
      </SectionFrame>

      <SectionFrame title="Filings">
        <FilingList items={context.filings} />
      </SectionFrame>

      <SectionFrame title="News">
        <NewsList stories={context.news} />
      </SectionFrame>
    </div>
  )
}

export function StockPlanLimitsSection({
  sections,
}: {
  sections: LockedMarketSection[]
}) {
  if (sections.length === 0) {
    return null
  }

  return (
    <div id="plan-limits">
      <SectionFrame title="Plan limits">
        <div className="market-grid-3 market-panel-grid grid">
          {sections.map((section) => (
            <div
              key={section.title}
              className="market-panel-tile px-3 py-3 sm:px-4"
            >
              <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
                Locked
              </div>
              <div className="mt-3 text-sm">{section.title}</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                {section.description}
              </p>
            </div>
          ))}
        </div>
      </SectionFrame>
    </div>
  )
}
