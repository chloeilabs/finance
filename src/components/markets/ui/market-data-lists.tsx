import {
  formatDate,
  formatDateTime,
  formatMetricValue,
} from "@/lib/markets-format"
import type {
  CalendarEvent,
  NewsStory,
  StatementTable,
} from "@/lib/shared/markets/core"

import { EmptyState } from "./market-layout-primitives"

export function CalendarList({ events }: { events: CalendarEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No scheduled events"
        description="Upcoming earnings, dividends, and releases will appear here when available."
      />
    )
  }

  return (
    <div className="market-panel-list">
      {events.map((event, index) => (
        <div
          key={[
            event.eventType,
            event.symbol,
            event.name,
            event.eventDate,
            event.time ?? "",
            event.value ?? "",
            event.estimate ?? "",
            String(index),
          ].join(":")}
          className="market-panel-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-3 py-2"
        >
          <div className="font-departureMono text-xs tracking-[0.18em] text-muted-foreground uppercase">
            {event.eventType}
          </div>
          <div className="min-w-0">
            <div className="text-sm">
              {event.symbol}{" "}
              <span className="text-muted-foreground">{event.name}</span>
            </div>
            <div className="text-xs text-muted-foreground">
              {event.value ?? event.estimate ?? "Scheduled"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(event.eventDate)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function NewsList({ stories }: { stories: NewsStory[] }) {
  if (stories.length === 0) {
    return (
      <EmptyState
        title="No market news"
        description="News will appear once the latest stock feed is available."
      />
    )
  }

  return (
    <div className="space-y-2.5">
      {stories.map((story) => (
        <a
          key={story.id}
          className="market-soft-surface block px-4 py-3.5 transition-colors hover:bg-muted/45"
          href={story.url}
          rel="noreferrer noopener"
          target="_blank"
        >
          <div className="flex flex-wrap items-center gap-2 text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
            <span>{story.site ?? "Market feed"}</span>
            <span>{story.symbol ?? "Macro"}</span>
            <span>{formatDateTime(story.publishedAt)}</span>
          </div>
          <div className="mt-2 text-sm leading-6">{story.title}</div>
          {story.text ? (
            <p className="mt-1.5 line-clamp-3 text-xs leading-5 text-muted-foreground">
              {story.text}
            </p>
          ) : null}
        </a>
      ))}
    </div>
  )
}

export function StatementTables({ tables }: { tables: StatementTable[] }) {
  if (tables.length === 0) {
    return (
      <EmptyState
        title="No statement data"
        description="Income statement, balance sheet, and cash flow tables will appear here."
      />
    )
  }

  return (
    <div className="space-y-3">
      {tables.map((table) => (
        <div key={table.title} className="market-table-frame">
          <table className="min-w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-background/80 text-left">
                <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                  {table.title}
                </th>
                {table.columns.map((column) => (
                  <th
                    key={`${table.title}:${column}`}
                  className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
              {table.rows.map((row) => (
                <tr
                  key={`${table.title}:${row.label}`}
                  className="border-b border-border/35 last:border-b-0"
                >
                  <td className="px-3 py-2 text-muted-foreground">
                    {row.label}
                  </td>
                  {row.values.map((value, index) => (
                    <td
                      key={[row.label, String(index)].join(":")}
                      className="px-3 py-2 text-right"
                    >
                      {formatMetricValue(value)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

export function FilingList({
  items,
}: {
  items: {
    formType: string | null
    filingDate: string | null
    description: string | null
    finalLink: string | null
  }[]
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        title="No SEC filings"
        description="Recent filings will appear here when the SEC feed returns data."
      />
    )
  }

  return (
    <div className="market-panel-list">
      {items.map((item, index) => (
        <a
          key={
            item.finalLink ??
            [
              item.formType ?? "form",
              item.filingDate ?? "date",
              String(index),
            ].join(":")
          }
          className="market-panel-row flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/35 sm:px-4"
          href={item.finalLink ?? "#"}
          rel="noreferrer noopener"
          target="_blank"
        >
          <div>
            <div className="font-departureMono text-xs tracking-tight">
              {item.formType ?? "Filing"}
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {item.description ?? "SEC filing"}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {formatDate(item.filingDate)}
          </div>
        </a>
      ))}
    </div>
  )
}
