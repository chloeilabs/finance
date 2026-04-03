import { TickerValueTable, TickerWidget } from "@/components/markets/ticker/ticker-widgets"
import { NewsList } from "@/components/markets/ui/market-data-lists"
import { formatCompactNumber, formatCurrency, formatPercent } from "@/lib/markets-format"
import { getEtfDossier } from "@/lib/server/markets/service"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"

export default async function EtfHoldingsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const dossier = await getEtfDossier(symbol)
  const topTenWeight = dossier.holdings
    .slice(0, 10)
    .reduce((total, holding) => total + (holding.weightPercentage ?? 0), 0)

  return (
    <div className="px-4 pt-6 sm:px-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <TickerWidget title="Top-Level Concentration">
            <div className="market-grid-3 market-panel-grid grid">
              <div className="market-panel-tile px-3 py-3 sm:px-4">
                <div className="text-xs text-muted-foreground">Total Holdings</div>
                <div className="mt-2 text-lg tracking-tight">
                  {formatCompactNumber(
                    dossier.info?.totalHoldings ?? dossier.holdings.length
                  )}
                </div>
              </div>
              <div className="market-panel-tile px-3 py-3 sm:px-4">
                <div className="text-xs text-muted-foreground">Top 10 Weight</div>
                <div className="mt-2 text-lg tracking-tight">
                  {formatPercent(topTenWeight, { scale: "fraction" })}
                </div>
              </div>
              <div className="market-panel-tile px-3 py-3 sm:px-4">
                <div className="text-xs text-muted-foreground">Tracked Assets</div>
                <div className="mt-2 text-lg tracking-tight">
                  {formatCurrency(dossier.info?.assets, { compact: true })}
                </div>
              </div>
            </div>
          </TickerWidget>

          <TickerWidget title="Holdings">
            <div className="market-table-frame">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-background/80 text-left">
                    <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                      Symbol
                    </th>
                    <th className="px-3 py-2 font-departureMono text-xs tracking-tight text-muted-foreground">
                      Name
                    </th>
                    <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                      Shares
                    </th>
                    <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                      Market Value
                    </th>
                    <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                      Weight
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dossier.holdings.map((holding, index) => (
                    <tr
                      key={[
                        holding.symbol ?? "holding",
                        holding.name ?? "name",
                        String(index),
                      ].join(":")}
                      className="border-b border-border/35 last:border-b-0"
                    >
                      <td className="px-3 py-2">
                        {holding.symbol ? (
                          <a
                            className="hover:underline"
                            href={getTickerHref(holding.symbol, "stock")}
                          >
                            {holding.symbol}
                          </a>
                        ) : (
                          "N/A"
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {holding.name ?? "Holding"}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCompactNumber(holding.sharesNumber)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(holding.marketValue, { compact: true })}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatPercent(holding.weightPercentage, { scale: "fraction" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TickerWidget>
        </div>

        <div className="space-y-6">
          <TickerWidget title="Sector Allocation">
            <TickerValueTable
              rows={dossier.sectorAllocations.map((allocation) => ({
                label: allocation.label,
                value: formatPercent(allocation.weightPercentage, {
                  scale: "fraction",
                }),
              }))}
            />
          </TickerWidget>

          <TickerWidget title="Country Allocation">
            <TickerValueTable
              rows={dossier.countryAllocations.map((allocation) => ({
                label: allocation.label,
                value: formatPercent(allocation.weightPercentage, {
                  scale: "fraction",
                }),
              }))}
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
