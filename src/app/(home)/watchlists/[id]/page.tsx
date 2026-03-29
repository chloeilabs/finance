import Link from "next/link"
import { notFound } from "next/navigation"

import {
  EmptyState,
  PageHeader,
  SectionFrame,
  WarningStrip,
} from "@/components/markets/ui/market-primitives"
import { WatchlistEditor } from "@/components/markets/watchlists/watchlist-editor"
import { WatchlistResearchTable } from "@/components/markets/watchlists/watchlist-research-table"
import { Button } from "@/components/ui/button"
import { getCurrentViewer } from "@/lib/server/auth-session"
import { isMarketStoreNotInitializedError } from "@/lib/server/markets/errors"
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
  let watchlistData: Awaited<ReturnType<typeof getWatchlistPageData>>

  try {
    watchlistData = await getWatchlistPageData({
      userId: viewer.id,
      watchlistId: id,
    })
  } catch (error) {
    if (!isMarketStoreNotInitializedError(error)) {
      throw error
    }

    return (
      <div className="pb-10">
        <PageHeader eyebrow="Watchlist" title="Watchlist unavailable" />
        <WarningStrip warnings={[error.message]} />
        <SectionFrame title="Storage">
          <EmptyState
            title="Watchlist storage is unavailable"
            description="Initialize the market tables and reload this page to restore watchlist editing and research."
          />
        </SectionFrame>
      </div>
    )
  }

  const { plan, rows, watchlist } = watchlistData

  if (!watchlist) {
    notFound()
  }

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Watchlist"
        title={watchlist.name}
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

      <SectionFrame title="Symbols">
        <WatchlistEditor
          watchlist={watchlist}
          watchlistLimit={plan.watchlistLimit}
        />
      </SectionFrame>

      <SectionFrame title="Research Table">
        <WatchlistResearchTable rows={rows} />
      </SectionFrame>
    </div>
  )
}
