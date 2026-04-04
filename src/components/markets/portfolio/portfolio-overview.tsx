import {
  formatCompactNumber,
  formatCurrency,
  formatPercent,
} from "@/lib/markets-format"
import type { PortfolioSummary } from "@/lib/shared/markets/portfolio"
import { cn } from "@/lib/utils"

type SummaryItemKey =
  | "totalValue"
  | "dayChangeValue"
  | "unrealizedGainLoss"
  | "cashBalance"
  | "income"

const SUMMARY_ITEMS: {
  key: SummaryItemKey
  label: string
  formatter: (summary: PortfolioSummary) => string
  detailFormatter?: (summary: PortfolioSummary) => string | null
}[] = [
  {
    key: "totalValue",
    label: "Total Value",
    formatter: (summary) =>
      formatCurrency(summary.totalValue, { currency: "USD" }),
  },
  {
    key: "dayChangeValue",
    label: "Day P/L",
    formatter: (summary) =>
      formatCurrency(summary.dayChangeValue, {
        currency: "USD",
        compact: true,
      }),
    detailFormatter: (summary) =>
      formatPercent(summary.dayChangePercent, { scale: "fraction" }),
  },
  {
    key: "unrealizedGainLoss",
    label: "Total P/L",
    formatter: (summary) =>
      formatCurrency(summary.unrealizedGainLoss, {
        currency: "USD",
        compact: true,
      }),
    detailFormatter: (summary) =>
      formatPercent(summary.unrealizedGainLossPercent, {
        scale: "fraction",
      }),
  },
  {
    key: "cashBalance",
    label: "Cash",
    formatter: (summary) =>
      formatCurrency(summary.cashBalance, {
        currency: "USD",
        compact: true,
      }),
  },
  {
    key: "income",
    label: "Income",
    formatter: (summary) =>
      formatCurrency(
        summary.weightedAverageDividendYield === null
          ? null
          : summary.investedValue * summary.weightedAverageDividendYield,
        { currency: "USD" }
      ),
    detailFormatter: (summary) =>
      summary.weightedAverageDividendYield === null
        ? null
        : `${formatPercent(summary.weightedAverageDividendYield, {
            scale: "fraction",
          })} yield`,
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
      <div className="grid grid-cols-3 gap-px bg-border/40 sm:grid-cols-6">
        {SUMMARY_ITEMS.map((item) => (
          <div
            key={item.key}
            className="market-soft-surface min-w-0 px-2.5 py-3 sm:px-4"
          >
            <div className="text-[11px] leading-tight text-muted-foreground sm:text-sm">
              {item.label}
            </div>
            <div
              className={cn(
                "mt-2 text-base leading-tight tracking-tight whitespace-nowrap sm:mt-3 sm:text-xl lg:text-2xl",
                item.key === "dayChangeValue"
                  ? getValueToneClass(summary.dayChangeValue)
                  : item.key === "unrealizedGainLoss"
                    ? getValueToneClass(summary.unrealizedGainLoss)
                    : null
              )}
            >
              {item.formatter(summary)}
            </div>
            <div
              className={cn(
                "mt-1 text-xs leading-tight whitespace-nowrap sm:text-sm",
                item.key === "dayChangeValue"
                  ? getValueToneClass(summary.dayChangeValue)
                  : item.key === "unrealizedGainLoss"
                    ? getValueToneClass(summary.unrealizedGainLoss)
                    : "text-muted-foreground"
              )}
            >
              {item.detailFormatter?.(summary) ?? null}
            </div>
          </div>
        ))}

        <div className="market-soft-surface min-w-0 px-2.5 py-3 sm:px-4">
          <div className="text-[11px] leading-tight text-muted-foreground sm:text-sm">
            Holdings
          </div>
          <div className="mt-2 text-base leading-tight tracking-tight whitespace-nowrap sm:mt-3 sm:text-xl lg:text-2xl">
            {formatCompactNumber(summary.holdingCount)}
          </div>
        </div>
      </div>
    </div>
  )
}
