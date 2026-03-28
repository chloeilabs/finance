import { notFound } from "next/navigation"

import {
  PageHeader,
  QuoteStrip,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { WatchlistEditor } from "@/components/markets/watchlists/watchlist-editor"
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
  const { plan, quotes, watchlist } = await getWatchlistPageData({
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
        title="Quotes"
        description="Batch quote strip for every symbol currently in the watchlist."
      >
        <QuoteStrip quotes={quotes} />
      </SectionFrame>
    </div>
  )
}
