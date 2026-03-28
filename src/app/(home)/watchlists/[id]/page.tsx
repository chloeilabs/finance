import Link from "next/link"
import { notFound } from "next/navigation"

import {
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { WatchlistEditor } from "@/components/markets/watchlists/watchlist-editor"
import { WatchlistResearchTable } from "@/components/markets/watchlists/watchlist-research-table"
import { Button } from "@/components/ui/button"
import { getCurrentViewer } from "@/lib/server/auth-session"
import { getWatchlistPageData } from "@/lib/server/markets/service"

export default async function WatchlistPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return null
  }

  const { id } = await params
  const { plan, rows, watchlist } = await getWatchlistPageData({
    userId: viewer.id,
    watchlistId: id,
  })

  if (!watchlist) {
    notFound()
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Watchlist"
        title={watchlist.name}
        description="Tracked symbols for your daily research flow. Updates run through the server-side cache and respect the active plan budget."
        actions={
          <Button asChild size="sm" variant="outline">
            <Link
              href={`/compare?symbols=${encodeURIComponent(
                watchlist.symbols.slice(0, 5).join(",")
              )}`}
            >
              Compare Top 5
            </Link>
          </Button>
        }
      />

      <SectionFrame
        title="Symbols"
        description="Add or remove names without leaving the page."
      >
        <WatchlistEditor
          watchlist={watchlist}
          watchlistLimit={plan.watchlistLimit}
        />
      </SectionFrame>

      <SectionFrame
        title="Research Table"
        description="Sortable quote, momentum, calendar, and quality context for the entire watchlist."
      >
        <WatchlistResearchTable rows={rows} />
      </SectionFrame>
    </div>
  )
}
