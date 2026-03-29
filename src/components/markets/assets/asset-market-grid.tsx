import Link from "next/link"

import {
  EmptyState,
  QuoteStrip,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { Sparkline } from "@/components/markets/ui/sparkline"
import { formatCurrency, formatDate, formatPercent } from "@/lib/markets-format"
import type { AssetMarketGroup } from "@/lib/shared/markets/intelligence"

export function AssetTeaserGrid({ groups }: { groups: AssetMarketGroup[] }) {
  if (groups.length === 0) {
    return (
      <EmptyState
        title="No multi-asset coverage yet"
        description="Validated Starter-accessible crypto, forex, and commodity data will appear here once market data is configured."
      />
    )
  }

  return (
    <div className="market-grid-3 market-panel-grid grid">
      {groups.map((group) => {
        const lead = group.items[0]?.quote ?? null

        return (
          <Link
            key={group.id}
            className="market-panel-tile block px-4 py-4 transition-colors hover:bg-muted/35"
            href={`/assets#${group.id}`}
          >
            <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
              {group.title}
            </div>
            <div className="mt-3 text-lg tracking-tight">
              {lead?.symbol ?? "Starter feed"}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              {lead
                ? `${formatCurrency(lead.price, {
                    currency: lead.currency ?? "USD",
                  })} • ${formatPercent(lead.changesPercentage)}`
                : group.description}
            </div>
            <div className="mt-3 text-xs text-muted-foreground">
              {group.items.length} tracked symbols
            </div>
          </Link>
        )
      })}
    </div>
  )
}

export function AssetGroupPanel({ group }: { group: AssetMarketGroup }) {
  if (group.items.length === 0) {
    return (
      <SectionFrame title={group.title} description={group.description}>
        <EmptyState
          title={`No ${group.title.toLowerCase()} data`}
          description="This asset group is enabled in the plan but the latest cache fill did not return data."
        />
      </SectionFrame>
    )
  }

  return (
    <SectionFrame title={group.title} description={group.description}>
      <QuoteStrip
        linkItems={false}
        quotes={group.items
          .map((item) => item.quote)
          .filter((item): item is NonNullable<typeof item> => item !== null)}
      />

      <div className="market-grid-4 market-panel-grid mt-4 grid">
        {group.items.map((item) => {
          const quote = item.quote
          const chart =
            item.intradayChart.length > 0 ? item.intradayChart : item.eodChart
          const latestEod = item.eodChart[item.eodChart.length - 1]

          return (
            <div
              key={`${group.id}:${item.symbol}`}
              className="market-panel-tile px-3 py-3 sm:px-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-departureMono text-sm tracking-tight">
                    {item.symbol}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {quote?.name ?? group.title}
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground">
                  <div>{formatPercent(quote?.changesPercentage)}</div>
                  <div className="mt-1">
                    {formatCurrency(quote?.price, {
                      currency: quote?.currency ?? "USD",
                    })}
                  </div>
                </div>
              </div>

              <Sparkline
                className="mt-5 h-20"
                values={chart.map((point) => point.close)}
              />

              <div className="mt-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {item.intradayChart.length > 0
                    ? `${String(item.intradayChart.length)} x 5m bars`
                    : "Compact EOD"}
                </span>
                <span>{formatDate(latestEod?.date)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </SectionFrame>
  )
}
