import Link from "next/link"

import { cn } from "@/lib/utils"

interface TickerSummaryItem {
  href?: string
  label: string
  tone?: "negative" | "positive"
  value: React.ReactNode
}

function SummaryColumn({
  items,
  title,
}: {
  items: TickerSummaryItem[]
  title?: string
}) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      {title ? (
        <div className="mb-2 text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
          {title}
        </div>
      ) : null}
      <div className="market-table-frame flex-1 overflow-hidden">
        <table className="min-w-full table-fixed border-collapse text-[13px] sm:text-sm">
          <tbody>
            {items.map((item, index) => (
              <tr
                key={`${item.label}:${item.href ?? "static"}:${String(index)}`}
                className="border-b border-border/35 last:border-b-0"
              >
                <td className="w-[44%] px-2.5 py-1.5 align-top text-xs text-muted-foreground sm:px-3">
                  {item.label}
                </td>
                <td
                  className={cn(
                    "px-2.5 py-1.5 text-right font-medium sm:px-3",
                    item.tone === "positive" &&
                      "text-[color:var(--vesper-teal)]",
                    item.tone === "negative" &&
                      "text-[color:var(--vesper-orange)]"
                  )}
                >
                  {item.href ? (
                    <Link className="hover:underline" href={item.href}>
                      {item.value}
                    </Link>
                  ) : (
                    item.value
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function TickerSummaryTables({
  className,
  leftItems,
  leftTitle,
  rightItems,
  rightTitle,
}: {
  className?: string
  leftItems: TickerSummaryItem[]
  leftTitle?: string
  rightItems: TickerSummaryItem[]
  rightTitle?: string
}) {
  return (
    <div className={cn("grid h-full gap-3 lg:grid-cols-2", className)}>
      <SummaryColumn items={leftItems} title={leftTitle} />
      <SummaryColumn items={rightItems} title={rightTitle} />
    </div>
  )
}
