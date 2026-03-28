import {
  CalendarList,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { getMarketCalendarFeed } from "@/lib/server/markets/service"

export default async function CalendarPage() {
  const events = await getMarketCalendarFeed()

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Calendar"
        title="Upcoming catalysts"
        description="Earnings and dividend events pulled into one operational calendar for the next two weeks."
      />

      <SectionFrame
        title="Event feed"
        description="Sorted chronologically to keep the near-term catalyst tape readable."
      >
        <CalendarList events={events} />
      </SectionFrame>
    </div>
  )
}
