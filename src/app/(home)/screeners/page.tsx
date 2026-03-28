import Link from "next/link"

import {
  EmptyState,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getCurrentViewer } from "@/lib/server/auth-session"
import {
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
    href: "/screeners?marketCapMin=200000000000&priceMin=20&volumeMin=1000000",
    description:
      "High-liquidity leaders with enough scale to anchor a research list.",
  },
  {
    name: "Income names",
    href: "/screeners?dividendMin=2&marketCapMin=5000000000",
    description: "Dividend-paying companies above the small-cap threshold.",
  },
  {
    name: "High beta tape",
    href: "/screeners?betaMin=1.5&volumeMin=2000000",
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
    sector: first("sector")?.trim() ?? undefined,
    exchange: first("exchange")?.trim() ?? undefined,
  }
}

function hasAnyFilter(filters: ScreenerFilterState) {
  return Object.values(filters).some((value) => value !== undefined)
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
  const [savedScreeners, results] = await Promise.all([
    getSavedMarketScreeners(viewer.id),
    hasAnyFilter(filters) ? runMarketScreener(filters) : Promise.resolve([]),
  ])

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Screeners"
        title="Company screener"
        description="Submit-only filters tuned for the Basic plan. Start with a preset or dial in market cap, beta, volume, price, and dividend thresholds."
      />

      <SectionFrame
        title="Presets"
        description="Fast starting points built for common research workflows."
      >
        <div className="grid gap-px border border-border/70 bg-border/70 lg:grid-cols-3">
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
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="GET">
          <Input
            name="marketCapMin"
            placeholder="Min market cap"
            defaultValue={filters.marketCapMin?.toString()}
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
          <Input
            name="sector"
            placeholder="Sector"
            defaultValue={filters.sector}
          />
          <Input
            name="exchange"
            placeholder="Exchange"
            defaultValue={filters.exchange}
          />
          <div className="flex items-center">
            <Button type="submit">Run Screener</Button>
          </div>
        </form>
      </SectionFrame>

      <SectionFrame
        title="Saved screens"
        description="Persistence is ready for user-defined screens even if this launch keeps the UI minimal."
      >
        {savedScreeners.length > 0 ? (
          <div className="grid gap-px border border-border/70 bg-border/70 lg:grid-cols-3">
            {savedScreeners.map((screen) => (
              <div key={screen.id} className="bg-background px-4 py-3">
                <div className="font-departureMono text-sm tracking-tight">
                  {screen.name}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {Object.entries(screen.filters)
                    .filter(([, value]) => value !== undefined)
                    .map(([key]) => key)
                    .join(", ") || "Custom filter set"}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="No saved screeners yet"
            description="The storage layer is ready. The first saved screen will appear here once the create flow is wired."
          />
        )}
      </SectionFrame>

      <SectionFrame
        title="Results"
        description="Returned companies from the active filter set."
      >
        {results.length > 0 ? (
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
                <div className="min-w-0 truncate text-muted-foreground">
                  {result.name}
                </div>
                <div className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
                  {result.exchangeShortName ?? result.type ?? "asset"}
                </div>
              </Link>
            ))}
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
