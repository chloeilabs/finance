import Link from "next/link"

import {
  EmptyState,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  formatCompactNumber,
  formatCurrency,
  formatLabeledMetricValue,
  formatMetricValue,
  formatPercent,
} from "@/lib/markets-format"
import { getComparePageData } from "@/lib/server/markets/service"

function parseSymbols(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value

  if (!raw) {
    return []
  }

  return raw
    .split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 5)
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const resolved = await searchParams
  const symbols = parseSymbols(resolved.symbols)
  const data = await getComparePageData(symbols)

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Compare" title="Peer comparison" />

      <SectionFrame title="Compare symbols">
        <form className="flex flex-col gap-3 sm:flex-row" method="GET">
          <Input
            className="rounded-none border-border/70"
            defaultValue={data.symbols.join(",")}
            name="symbols"
            placeholder="AAPL,MSFT,NVDA,AMZN,META"
          />
          <Button type="submit">Compare</Button>
        </form>
      </SectionFrame>

      <SectionFrame title="Comparison grid">
        {data.entries.length > 0 ? (
          <div className="overflow-x-auto border border-border/70">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-left">
                  <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                    Symbol
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Price
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Change
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Market Cap
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
                    Altman Z
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Piotroski
                  </th>
                  <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                    Street
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => (
                  <tr
                    key={entry.symbol}
                    className="border-b border-border/40 last:border-b-0"
                  >
                    <td className="px-3 py-3">
                      <div>
                        <Link
                          className="font-departureMono text-sm tracking-tight hover:underline"
                          href={`/stocks/${encodeURIComponent(entry.symbol)}`}
                        >
                          {entry.symbol}
                        </Link>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {entry.companyName ?? "Selected company"}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCurrency(entry.price)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatPercent(entry.changesPercentage)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatCompactNumber(entry.marketCap)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMetricValue(entry.peRatio)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatLabeledMetricValue("FCF Yield", entry.fcfYield)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatLabeledMetricValue("ROIC", entry.roic)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMetricValue(entry.altmanZScore)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {formatMetricValue(entry.piotroskiScore)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {entry.analystConsensus ?? "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No symbols selected"
            description="Submit 2-5 US equity symbols to build a comparison grid."
          />
        )}
      </SectionFrame>
    </div>
  )
}
