import {
  TickerFactGrid,
  TickerWidget,
} from "@/components/markets/ticker/ticker-widgets"
import { CompanyProfileCopy } from "@/components/markets/ui/company-profile-copy"
import { FilingList } from "@/components/markets/ui/market-data-lists"
import { EmptyState } from "@/components/markets/ui/market-primitives"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/markets-format"
import { getStockDossier } from "@/lib/server/markets/service"

import { redirectIfEtfSymbol } from "../stock-route-utils"

export default async function StockProfilePage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "profile")

  const dossier = await getStockDossier(symbol)
  const profile = dossier.profile
  const headquarters = [profile?.city, profile?.state, profile?.country]
    .filter(Boolean)
    .join(", ")

  return (
    <div className="px-4 pt-6 sm:px-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_22rem]">
        <TickerWidget title="Company Profile">
          {profile?.description ? (
            <CompanyProfileCopy
              collapsible={false}
              text={profile.description}
            />
          ) : (
            <p className="text-sm leading-6 text-muted-foreground">
              Company profile coverage is unavailable for this symbol.
            </p>
          )}
        </TickerWidget>

        <div className="space-y-6">
          <TickerWidget title="Company Details">
            <TickerFactGrid
              items={[
                {
                  label: "Website",
                  value: profile?.website ? (
                    <a
                      className="text-primary hover:underline"
                      href={profile.website}
                      rel="noreferrer noopener"
                      target="_blank"
                    >
                      {profile.website}
                    </a>
                  ) : (
                    "N/A"
                  ),
                },
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
                {
                  label: "IPO Date",
                  value: formatDate(profile?.ipoDate),
                },
                {
                  label: "Employees",
                  value: formatCompactNumber(profile?.employees),
                },
                {
                  label: "Free Float",
                  value: formatPercent(dossier.shareFloat?.freeFloatPercentage),
                },
              ]}
            />
          </TickerWidget>

          <TickerWidget title="SEC Profile">
            <TickerFactGrid
              columns={1}
              items={[
                {
                  label: "Registrant",
                  value: dossier.secProfile?.registrantName ?? "N/A",
                },
                {
                  label: "CIK",
                  value: dossier.secProfile?.cik ?? "N/A",
                },
                {
                  label: "SIC",
                  value: dossier.secProfile?.sicCode ?? "N/A",
                },
                {
                  label: "SIC Description",
                  value: dossier.secProfile?.sicDescription ?? "N/A",
                },
                {
                  label: "SIC Group",
                  value: dossier.secProfile?.sicGroup ?? "N/A",
                },
              ]}
            />
          </TickerWidget>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <TickerWidget title="Executives">
          {dossier.executives.length > 0 ? (
            <div className="market-grid-3 market-panel-grid grid">
              {dossier.executives.map((executive, index) => (
                <div
                  key={[
                    executive.name ?? "executive",
                    executive.title ?? "title",
                    String(index),
                  ].join(":")}
                  className="market-panel-tile px-3 py-3 sm:px-4"
                >
                  <div className="text-xs text-muted-foreground">
                    {executive.title ?? "Executive"}
                  </div>
                  <div className="mt-2 text-sm">
                    {executive.name ?? "Unknown"}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatCurrency(executive.pay, {
                      compact: true,
                      currency: executive.currencyPay ?? "USD",
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              description="Executive coverage will appear here when the company profile endpoints return leadership data."
              title="No executive roster"
            />
          )}
        </TickerWidget>

        <TickerWidget title="Recent Filings">
          <FilingList items={dossier.filings} />
        </TickerWidget>
      </div>
    </div>
  )
}
