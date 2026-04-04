import {
  formatCompactNumber,
  formatCurrency,
  formatPercent,
} from "@/lib/markets-format"
import type { PortfolioSummary } from "@/lib/shared/markets/portfolio"
import { cn } from "@/lib/utils"

const SUMMARY_ITEMS: {
  key: keyof PortfolioSummary
  label: string
  formatter: (value: number | null | undefined) => string
}[] = [
  {
    key: "totalValue",
    label: "Total value",
    formatter: (value) => formatCurrency(value, { currency: "USD" }),
  },
  {
    key: "dayChangeValue",
    label: "Day P/L",
    formatter: (value) => formatCurrency(value, { currency: "USD", compact: true }),
  },
  {
    key: "unrealizedGainLoss",
    label: "Total P/L",
    formatter: (value) => formatCurrency(value, { currency: "USD", compact: true }),
  },
  {
    key: "cashBalance",
    label: "Cash",
    formatter: (value) => formatCurrency(value, { currency: "USD", compact: true }),
  },
  {
    key: "weightedAverageDividendYield",
    label: "Weighted Avg Dividend Yield",
    formatter: (value) => formatPercent(value, { scale: "fraction" }),
  },
]

function getValueToneClass(value: number | null | undefined) {
  if (value === null || value === undefined || value === 0) {
    return "text-foreground"
  }

  return value > 0
    ? "text-[color:var(--vesper-teal)]"
    : "text-[color:var(--vesper-orange)]"
}

export function PortfolioOverview({
  summary,
}: {
  summary: PortfolioSummary
}) {
  return (
    <div className="overflow-hidden border border-border/40">
      <div className="grid gap-px bg-border/40 lg:grid-cols-6">
        {SUMMARY_ITEMS.map((item) => (
          <div
            key={item.key}
            className="market-soft-surface px-3 py-3 sm:px-4"
          >
            <div className="text-sm text-muted-foreground">{item.label}</div>
            <div
              className={cn(
                "mt-3 text-xl tracking-tight sm:text-2xl",
                item.key === "dayChangeValue"
                  ? getValueToneClass(summary.dayChangeValue)
                  : item.key === "unrealizedGainLoss"
                    ? getValueToneClass(summary.unrealizedGainLoss)
                    : null
              )}
            >
              {item.formatter(summary[item.key])}
            </div>
            <div
              className={cn(
                "mt-1 text-sm",
                item.key === "dayChangeValue"
                  ? getValueToneClass(summary.dayChangeValue)
                  : item.key === "unrealizedGainLoss"
                    ? getValueToneClass(summary.unrealizedGainLoss)
                    : "text-muted-foreground"
              )}
            >
              {item.key === "dayChangeValue"
                ? formatPercent(summary.dayChangePercent, { scale: "fraction" })
                : item.key === "unrealizedGainLoss"
                  ? formatPercent(summary.unrealizedGainLossPercent, {
                      scale: "fraction",
                    })
                  : null}
            </div>
          </div>
        ))}

        <div className="market-soft-surface px-3 py-3 sm:px-4">
          <div className="text-sm text-muted-foreground">Holdings</div>
          <div className="mt-3 text-xl tracking-tight sm:text-2xl">
            {formatCompactNumber(summary.holdingCount)}
          </div>
        </div>
      </div>
    </div>
  )
}
