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
      <PageHeader eyebrow="News" title="Market news" />

      <SectionFrame title="Stock feed">
        <NewsList stories={stories} />
      </SectionFrame>

      <SectionFrame title="General feed">
        <NewsList stories={snapshot.generalNews} />
      </SectionFrame>
    </div>
  )
}
