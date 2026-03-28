"use client"

import Link from "next/link"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatPercent,
} from "@/lib/markets-format"
import type { ResearchQuoteRow } from "@/lib/shared"

const SORT_OPTIONS = [
  { value: "symbol", label: "Symbol" },
  { value: "marketCap", label: "Market Cap" },
  { value: "price", label: "Price" },
  { value: "changesPercentage", label: "Change" },
  { value: "rsi14", label: "RSI 14" },
  { value: "nextEarningsDate", label: "Next Earnings" },
  { value: "piotroskiScore", label: "Piotroski" },
] as const

type SortKey = (typeof SORT_OPTIONS)[number]["value"]

function getSortValue(row: ResearchQuoteRow, sortBy: SortKey) {
  switch (sortBy) {
    case "symbol":
      return row.symbol
    case "nextEarningsDate":
      return row.nextEarningsDate ?? ""
    case "marketCap":
      return row.marketCap ?? Number.NEGATIVE_INFINITY
    case "price":
      return row.price ?? Number.NEGATIVE_INFINITY
    case "changesPercentage":
      return row.changesPercentage ?? Number.NEGATIVE_INFINITY
    case "rsi14":
      return row.rsi14 ?? Number.NEGATIVE_INFINITY
    case "piotroskiScore":
      return row.piotroskiScore ?? Number.NEGATIVE_INFINITY
  }
}

export function WatchlistResearchTable({
  rows,
}: {
  rows: ResearchQuoteRow[]
}) {
  const [sortBy, setSortBy] = useState<SortKey>("marketCap")
  const [direction, setDirection] = useState<"asc" | "desc">("desc")

  const sortedRows = [...rows].sort((left, right) => {
    const leftValue = getSortValue(left, sortBy)
    const rightValue = getSortValue(right, sortBy)

    if (typeof leftValue === "string" && typeof rightValue === "string") {
      return direction === "asc"
        ? leftValue.localeCompare(rightValue)
        : rightValue.localeCompare(leftValue)
    }

    const leftNumber =
      typeof leftValue === "number" ? leftValue : Number.NEGATIVE_INFINITY
    const rightNumber =
      typeof rightValue === "number" ? rightValue : Number.NEGATIVE_INFINITY

    return direction === "asc"
      ? leftNumber - rightNumber
      : rightNumber - leftNumber
  })

  if (rows.length === 0) {
    return (
      <div className="border border-dashed border-border/70 px-4 py-8 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">No research rows</div>
        <p className="mt-1 max-w-2xl leading-6">
          Add symbols to the watchlist to populate the research table.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Sort</span>
            <select
              className="border border-border/70 bg-background px-2 py-1 text-sm"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value as SortKey)
              }}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Direction</span>
            <select
              className="border border-border/70 bg-background px-2 py-1 text-sm"
              value={direction}
              onChange={(event) => {
                setDirection(event.target.value as "asc" | "desc")
              }}
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </label>
        </div>

        <Button asChild size="sm" variant="outline">
          <Link
            href={`/compare?symbols=${encodeURIComponent(
              sortedRows
                .slice(0, 5)
                .map((row) => row.symbol)
                .join(",")
            )}`}
          >
            Compare Top 5
          </Link>
        </Button>
      </div>

      <div className="overflow-x-auto border border-border/70">
        <table className="min-w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-muted/30 text-left">
              <th className="px-3 py-2 font-departureMono text-xs tracking-tight">
                Symbol
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Price
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Change
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Market Cap
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                RSI 14
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Next Earnings
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Street
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Piotroski
              </th>
              <th className="px-3 py-2 text-right font-departureMono text-xs tracking-tight text-muted-foreground">
                Altman Z
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr
                key={row.symbol}
                className="border-b border-border/40 last:border-b-0"
              >
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <Link
                        className="font-departureMono text-sm tracking-tight hover:underline"
                        href={`/stocks/${encodeURIComponent(row.symbol)}`}
                      >
                        {row.symbol}
                      </Link>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.name ?? "Tracked company"}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCurrency(row.price, {
                    currency: row.currency ?? "USD",
                  })}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatPercent(row.changesPercentage)}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatCompactNumber(row.marketCap)}
                </td>
                <td className="px-3 py-3 text-right">
                  {row.rsi14?.toFixed(2) ?? "N/A"}
                </td>
                <td className="px-3 py-3 text-right">
                  {formatDate(row.nextEarningsDate)}
                </td>
                <td className="px-3 py-3 text-right">
                  {row.analystConsensus ?? "N/A"}
                </td>
                <td className="px-3 py-3 text-right">
                  {row.piotroskiScore ?? "N/A"}
                </td>
                <td className="px-3 py-3 text-right">
                  {row.altmanZScore?.toFixed(2) ?? "N/A"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
