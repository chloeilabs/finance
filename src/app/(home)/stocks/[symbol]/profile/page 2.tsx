import { CompanyProfileCopy } from "@/components/markets/ui/company-profile-copy"
import { FilingList } from "@/components/markets/ui/market-data-lists"
import { EmptyState, SectionFrame } from "@/components/markets/ui/market-primitives"
import { formatCompactNumber, formatDate, formatPercent } from "@/lib/markets-format"
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

  return (
    <>
      <SectionFrame title="Company Profile">
        <div className="market-soft-surface grid gap-6 px-4 py-4 lg:grid-cols-[minmax(0,1.2fr)_18rem]">
          <div className="min-w-0">
            {profile?.description ? (
              <CompanyProfileCopy text={profile.description} />
            ) : (
              <p className="text-sm leading-6 text-muted-foreground">
                Company profile coverage is unavailable for this symbol.
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <div>
              <div className="text-xs text-muted-foreground">Website</div>
              <div className="mt-1 text-sm">{profile?.website ?? "N/A"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">IPO Date</div>
              <div className="mt-1 text-sm">{formatDate(profile?.ipoDate)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Employees</div>
              <div className="mt-1 text-sm">
                {formatCompactNumber(profile?.employees)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Free Float</div>
              <div className="mt-1 text-sm">
                {formatPercent(dossier.shareFloat?.freeFloatPercentage)}
              </div>
            </div>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame title="Executives">
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
                <div className="mt-2 text-sm">{executive.name ?? "Unknown"}</div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No executive roster"
            description="Executive coverage will appear here when the company profile endpoints return leadership data."
          />
        )}
      </SectionFrame>

      <SectionFrame title="SEC Profile">
        <div className="market-grid-3 market-panel-grid grid">
          <div className="market-panel-tile px-3 py-3 sm:px-4">
            <div className="text-xs text-muted-foreground">Registrant</div>
            <div className="mt-2 text-sm">
              {dossier.secProfile?.registrantName ?? "N/A"}
            </div>
          </div>
          <div className="market-panel-tile px-3 py-3 sm:px-4">
            <div className="text-xs text-muted-foreground">CIK</div>
            <div className="mt-2 text-sm">{dossier.secProfile?.cik ?? "N/A"}</div>
          </div>
          <div className="market-panel-tile px-3 py-3 sm:px-4">
            <div className="text-xs text-muted-foreground">SIC</div>
            <div className="mt-2 text-sm">
              {dossier.secProfile?.sicCode ?? "N/A"}{" "}
              {dossier.secProfile?.sicDescription ?? ""}
            </div>
          </div>
        </div>
      </SectionFrame>

      <SectionFrame title="Recent Filings">
        <FilingList items={dossier.filings} />
      </SectionFrame>
    </>
  )
}
