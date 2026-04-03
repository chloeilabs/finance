"use client"

import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/markets-format"
import type { HistoricalPriceRow } from "@/lib/shared/markets/intelligence"
import { cn } from "@/lib/utils"

import { EmptyState } from "../ui/market-layout-primitives"

type HistoryWindow = "3M" | "6M" | "1Y" | "3Y" | "MAX"

const WINDOW_OPTIONS: HistoryWindow[] = ["3M", "6M", "1Y", "3Y", "MAX"]
const PAGE_SIZE = 25

function getWindowStart(latestDate: string, window: HistoryWindow) {
  if (window === "MAX") {
    return null
  }

  const parsed = new Date(latestDate)

  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  const next = new Date(parsed)

  switch (window) {
    case "3M":
      next.setMonth(next.getMonth() - 3)
      break
    case "6M":
      next.setMonth(next.getMonth() - 6)
      break
    case "1Y":
      next.setFullYear(next.getFullYear() - 1)
      break
    case "3Y":
      next.setFullYear(next.getFullYear() - 3)
      break
  }

  return next
}

export function TickerHistoryTable({
  currency,
  rows,
}: {
  currency?: string | null
  rows: HistoricalPriceRow[]
}) {
  const [window, setWindow] = useState<HistoryWindow>("1Y")
  const [page, setPage] = useState(0)

  const filteredRows = useMemo(() => {
    const latestDate = rows[0]?.date

    if (!latestDate) {
      return []
    }

    const start = getWindowStart(latestDate, window)

    return start
      ? rows.filter((row) => new Date(row.date) >= start)
      : rows
  }, [rows, window])

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE))
  const pageRows = filteredRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No historical prices"
        description="Historical daily pricing will appear here when EOD data is available."
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {WINDOW_OPTIONS.map((option) => (
            <button
              key={option}
              className={cn(
                "market-chip px-3 py-1 text-xs transition-colors hover:bg-muted/60",
                option === window && "bg-muted text-foreground"
              )}
              type="button"
              onClick={() => {
                setWindow(option)
                setPage(0)
              }}
            >
              {option}
            </button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground">
          {filteredRows.length} daily rows
        </div>
      </div>

      <div className="market-table-frame">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/50 bg-background/80 text-left">
              <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                Date
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Open
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                High
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Low
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Close
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Adj Close
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Change
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Volume
              </th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <tr
                key={row.date}
                className="border-b border-border/35 last:border-b-0"
              >
                <td className="px-3 py-2">{formatDate(row.date)}</td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.open, { currency: currency ?? "USD" })}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.high, { currency: currency ?? "USD" })}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.low, { currency: currency ?? "USD" })}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.close, { currency: currency ?? "USD" })}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCurrency(row.adjustedClose, {
                    currency: currency ?? "USD",
                  })}
                </td>
                <td
                  className={cn(
                    "px-3 py-2 text-right",
                    (row.changePercent ?? 0) >= 0
                      ? "text-[color:var(--vesper-teal)]"
                      : "text-[color:var(--vesper-orange)]"
                  )}
                >
                  {formatPercent(row.changePercent)}
                </td>
                <td className="px-3 py-2 text-right">
                  {formatCompactNumber(row.volume)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          Page {page + 1} of {pageCount}
        </div>
        <div className="flex gap-2">
          <Button
            disabled={page === 0}
            size="sm"
            variant="outline"
            onClick={() => {
              setPage((current) => Math.max(0, current - 1))
            }}
          >
            Previous
          </Button>
          <Button
            disabled={page >= pageCount - 1}
            size="sm"
            variant="outline"
            onClick={() => {
              setPage((current) => Math.min(pageCount - 1, current + 1))
            }}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
