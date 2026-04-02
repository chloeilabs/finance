import {
  FilingList,
  InsiderFeedList,
  NewsList,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import {
  getLatestGeneralMarketNews,
  getLatestInsiderFeed,
  getLatestMarketNews,
  getLatestSecActivity,
} from "@/lib/server/markets/service"

export default async function NewsPage() {
  const [stories, generalStories, latestFilings, latestInsiderTrades] =
    await Promise.all([
      getLatestMarketNews(24),
      getLatestGeneralMarketNews(),
      getLatestSecActivity(),
      getLatestInsiderFeed(),
    ])

  return (
    <div className="pb-10">
      <PageHeader eyebrow="News" title="Market news" />

      <SectionFrame title="Stock feed">
        <NewsList stories={stories} />
      </SectionFrame>

      <SectionFrame title="General feed">
        <NewsList stories={generalStories} />
      </SectionFrame>

      <SectionFrame title="Latest SEC activity">
        <FilingList items={latestFilings} />
      </SectionFrame>

      <SectionFrame title="Latest insider tape">
        <InsiderFeedList items={latestInsiderTrades} />
      </SectionFrame>
    </div>
  )
}
