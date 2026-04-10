import {
  NewsList,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import {
  getLatestGeneralMarketNews,
  getLatestMarketNews,
} from "@/lib/server/markets/service"

export default async function NewsPage() {
  const [stories, generalStories] = await Promise.all([
    getLatestMarketNews(24),
    getLatestGeneralMarketNews(),
  ])

  return (
    <div className="pb-10">
      <PageHeader
        title="Market news"
        titleClassName="font-departureMono text-base tracking-tight sm:text-lg"
      />

      <SectionFrame title="Stock feed">
        <NewsList stories={stories} />
      </SectionFrame>

      <SectionFrame title="General feed">
        <NewsList stories={generalStories} />
      </SectionFrame>
    </div>
  )
}
