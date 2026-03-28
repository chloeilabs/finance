import {
  NewsList,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { getLatestMarketNews } from "@/lib/server/markets/service"

export default async function NewsPage() {
  const stories = await getLatestMarketNews(24)

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="News"
        title="Market news"
        description="A wider headline tape than the home surface, still cached tightly enough to behave well on the Basic plan."
      />

      <SectionFrame
        title="Latest stories"
        description="Recent stock stories and market headlines from the FMP news feed."
      >
        <NewsList stories={stories} />
      </SectionFrame>
    </div>
  )
}
