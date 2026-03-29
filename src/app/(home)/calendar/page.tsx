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
      <PageHeader eyebrow="Calendar" title="Upcoming catalysts" />

      <SectionFrame title="Event feed">
        <CalendarList events={events} />
      </SectionFrame>
    </div>
  )
}
