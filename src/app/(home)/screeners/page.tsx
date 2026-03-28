import Link from "next/link"

import {
  AddResultsToWatchlistButton,
  DeleteScreenerButton,
  SaveScreenerButton,
} from "@/components/markets/screeners/screener-actions"
import {
  EmptyState,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatCompactNumber, formatCurrency } from "@/lib/markets-format"
import { getCurrentViewer } from "@/lib/server/auth-session"
import {
  getMarketScreenerOptions,
  getMarketSidebarData,
  getSavedMarketScreeners,
  runMarketScreener,
} from "@/lib/server/markets/service"
import type { ScreenerFilterState } from "@/lib/shared"

const PRESET_SCREENERS: {
  name: string
  href: string
  description: string
}[] = [
  {
    name: "Megacap compounders",
    href: "/screeners?marketCapMin=200000000000&priceMin=20&volumeMin=1000000&sortBy=marketCap&sortDirection=desc",
    description:
      "High-liquidity leaders with enough scale to anchor a research list.",
  },
  {
    name: "Income names",
    href: "/screeners?dividendMin=2&marketCapMin=5000000000&sortBy=dividend&sortDirection=desc",
    description: "Dividend-paying companies above the small-cap threshold.",
  },
  {
    name: "High beta tape",
    href: "/screeners?betaMin=1.5&volumeMin=2000000&sortBy=beta&sortDirection=desc",
    description: "Names where the tape tends to move faster than the market.",
  },
] as const

function toNumber(value: string | undefined) {
  if (!value) {
    return undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function toBoolean(value: string | undefined) {
  if (value === "true") {
    return true
  }

  if (value === "false") {
    return false
  }

  return undefined
}

function parseFilters(
  searchParams: Record<string, string | string[] | undefined>
): ScreenerFilterState {
  const first = (key: string) => {
    const value = searchParams[key]
    return Array.isArray(value) ? value[0] : value
  }

  return {
    marketCapMin: toNumber(first("marketCapMin")),
    marketCapMax: toNumber(first("marketCapMax")),
    betaMin: toNumber(first("betaMin")),
    betaMax: toNumber(first("betaMax")),
    volumeMin: toNumber(first("volumeMin")),
    volumeMax: toNumber(first("volumeMax")),
    dividendMin: toNumber(first("dividendMin")),
    dividendMax: toNumber(first("dividendMax")),
    priceMin: toNumber(first("priceMin")),
    priceMax: toNumber(first("priceMax")),
    isActivelyTrading: toBoolean(first("isActivelyTrading")),
    isEtf: toBoolean(first("isEtf")),
    sector: first("sector")?.trim() ?? undefined,
    industry: first("industry")?.trim() ?? undefined,
    exchange: first("exchange")?.trim() ?? undefined,
    sortBy: (first("sortBy") as ScreenerFilterState["sortBy"]) ?? undefined,
    sortDirection:
      (first("sortDirection") as ScreenerFilterState["sortDirection"]) ??
      undefined,
  }
}

function hasAnyFilter(filters: ScreenerFilterState) {
  return Object.values(filters).some((value) => value !== undefined)
}

function buildFilterHref(filters: ScreenerFilterState) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined) {
      continue
    }

    searchParams.set(key, String(value))
  }

  const query = searchParams.toString()
  return query === "" ? "/screeners" : `/screeners?${query}`
}

export default async function ScreenersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return null
  }

  const resolvedSearchParams = await searchParams
  const filters = parseFilters(resolvedSearchParams)
  const [{ watchlists }, savedScreeners, results, options] = await Promise.all([
    getMarketSidebarData(viewer.id),
    getSavedMarketScreeners(viewer.id),
    hasAnyFilter(filters) ? runMarketScreener(filters) : Promise.resolve([]),
    getMarketScreenerOptions(),
  ])

  const compareHref = `/compare?symbols=${encodeURIComponent(
    results
      .slice(0, 5)
      .map((result) => result.symbol)
      .join(",")
  )}`

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Screeners"
        title="Company screener"
        description="Submit-based filters with hydrated FMP reference data, saved screens, and direct handoff into compare and watchlist workflows."
      />

      <SectionFrame
        title="Presets"
        description="Fast starting points built for common research workflows."
      >
        <div className="market-grid-3 grid gap-px border border-border/70 bg-border/70">
          {PRESET_SCREENERS.map((preset) => (
            <Link
              key={preset.name}
              className="bg-background px-4 py-4 transition-colors hover:bg-muted/35"
              href={preset.href}
            >
              <div className="font-departureMono text-sm tracking-tight">
                {preset.name}
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {preset.description}
              </p>
            </Link>
          ))}
        </div>
      </SectionFrame>

      <SectionFrame
        title="Filter builder"
        description="The form executes only on submit and returns cached screener results when available."
      >
        <form className="market-grid-4 grid gap-3" method="GET">
          <Input
            name="marketCapMin"
            placeholder="Min market cap"
            defaultValue={filters.marketCapMin?.toString()}
          />
          <Input
            name="marketCapMax"
            placeholder="Max market cap"
            defaultValue={filters.marketCapMax?.toString()}
          />
          <Input
            name="betaMin"
            placeholder="Min beta"
            defaultValue={filters.betaMin?.toString()}
          />
          <Input
            name="volumeMin"
            placeholder="Min volume"
            defaultValue={filters.volumeMin?.toString()}
          />
          <Input
            name="dividendMin"
            placeholder="Min dividend yield"
            defaultValue={filters.dividendMin?.toString()}
          />
          <Input
            name="priceMin"
            placeholder="Min price"
            defaultValue={filters.priceMin?.toString()}
          />
          <select
            className="border border-border/70 bg-background px-3 py-2 text-sm"
            defaultValue={filters.sector ?? ""}
            name="sector"
          >
            <option value="">Any sector</option>
            {options.sectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
          <select
            className="border border-border/70 bg-background px-3 py-2 text-sm"
            defaultValue={filters.industry ?? ""}
            name="industry"
          >
            <option value="">Any industry</option>
            {options.industries.map((industry) => (
              <option key={industry} value={industry}>
                {industry}
              </option>
            ))}
          </select>
          <select
            className="border border-border/70 bg-background px-3 py-2 text-sm"
            defaultValue={filters.exchange ?? ""}
            name="exchange"
          >
            <option value="">Any exchange</option>
            {options.exchanges.map((exchange) => (
              <option key={exchange} value={exchange}>
                {exchange}
              </option>
            ))}
          </select>
          <select
            className="border border-border/70 bg-background px-3 py-2 text-sm"
            defaultValue={
              filters.isActivelyTrading === undefined
                ? ""
                : String(filters.isActivelyTrading)
            }
            name="isActivelyTrading"
          >
            <option value="">Any listing status</option>
            <option value="true">Actively trading</option>
            <option value="false">Inactive</option>
          </select>
          <select
            className="border border-border/70 bg-background px-3 py-2 text-sm"
            defaultValue={
              filters.isEtf === undefined ? "" : String(filters.isEtf)
            }
            name="isEtf"
          >
            <option value="">Stocks and ETFs</option>
            <option value="false">Stocks only</option>
            <option value="true">ETFs only</option>
          </select>
          <select
            className="border border-border/70 bg-background px-3 py-2 text-sm"
            defaultValue={filters.sortBy ?? "marketCap"}
            name="sortBy"
          >
            <option value="marketCap">Sort by market cap</option>
            <option value="price">Sort by price</option>
            <option value="volume">Sort by volume</option>
            <option value="beta">Sort by beta</option>
            <option value="dividend">Sort by dividend</option>
            <option value="symbol">Sort by symbol</option>
          </select>
          <select
            className="border border-border/70 bg-background px-3 py-2 text-sm"
            defaultValue={filters.sortDirection ?? "desc"}
            name="sortDirection"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          <div className="flex items-center gap-3">
            <Button type="submit">Run Screener</Button>
            {hasAnyFilter(filters) ? (
              <SaveScreenerButton filters={filters} />
            ) : null}
          </div>
        </form>
      </SectionFrame>

      <SectionFrame
        title="Saved screens"
        description="Saved screener definitions can be reopened, deleted, and reused as portfolio building blocks."
      >
        {savedScreeners.length > 0 ? (
          <div className="market-grid-2 grid gap-px border border-border/70 bg-border/70">
            {savedScreeners.map((screen) => (
              <div
                key={screen.id}
                className="flex items-start justify-between gap-3 bg-background px-4 py-3"
              >
                <div>
                  <Link
                    className="font-departureMono text-sm tracking-tight hover:underline"
                    href={buildFilterHref(screen.filters)}
                  >
                    {screen.name}
                  </Link>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {Object.entries(screen.filters)
                      .filter(([, value]) => value !== undefined)
                      .map(([key]) => key)
                      .join(", ") || "Custom filter set"}
                  </div>
                </div>
                <DeleteScreenerButton screenerId={screen.id} />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved screeners yet"
            description="Save the active filter set to keep it in your daily workflow."
          />
        )}
      </SectionFrame>

      <SectionFrame
        title="Results"
        description="Returned companies from the active filter set."
      >
        {results.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="text-sm text-muted-foreground">
                {results.length} results
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button asChild size="sm" variant="outline">
                  <Link href={compareHref}>Compare Top 5</Link>
                </Button>
                <AddResultsToWatchlistButton
                  symbols={results.map((result) => result.symbol)}
                  watchlists={watchlists}
                />
              </div>
            </div>

            <div className="space-y-2">
              {results.map((result) => (
                <Link
                  key={`${result.symbol}:${result.exchangeShortName ?? ""}`}
                  className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3 border border-border/70 px-4 py-3 transition-colors hover:bg-muted/35"
                  href={`/stocks/${encodeURIComponent(result.symbol)}`}
                >
                  <div className="font-departureMono text-sm tracking-tight">
                    {result.symbol}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm">{result.name}</div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>
                        {result.exchangeShortName ?? result.type ?? "asset"}
                      </span>
                      <span>{result.sector ?? "Sector N/A"}</span>
                      <span>{result.industry ?? "Industry N/A"}</span>
                      <span>{formatCurrency(result.price)}</span>
                      <span>{formatCompactNumber(result.marketCap)}</span>
                    </div>
                  </div>
                  <div className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                    {result.exchangeShortName ?? result.type ?? "asset"}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState
            title="No screener results yet"
            description="Choose a preset or submit the filter form to populate this list."
          />
        )}
      </SectionFrame>
    </div>
  )
}
