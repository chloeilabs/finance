import {
  NewsList,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import {
  getLatestMarketNews,
  getMarketsSnapshot,
} from "@/lib/server/markets/service"

export default async function NewsPage() {
  const [stories, snapshot] = await Promise.all([
    getLatestMarketNews(24),
    getMarketsSnapshot(),
  ])

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="News"
        title="Market news"
        description="Stock-specific and broader market headline feeds, cached tightly enough to stay responsive across supported FMP tiers."
      />

      <SectionFrame
        title="Stock feed"
        description="Recent stock stories from the FMP stock news feed."
      >
        <NewsList stories={stories} />
      </SectionFrame>

      <SectionFrame
        title="General feed"
        description="Broader market and macro headlines from the general news feed."
      >
        <NewsList stories={snapshot.generalNews} />
      </SectionFrame>
    </div>
  )
}
