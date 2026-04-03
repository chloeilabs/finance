import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatSignedNumber,
} from "@/lib/markets-format"
import { cn } from "@/lib/utils"

import { type TickerTabItem,TickerTabNav } from "./ticker-tab-nav"

interface TickerActionItem {
  disabled?: boolean
  href?: string
  label: string
}

interface TickerPriceRailProps {
  currency?: string | null
  current: {
    change: number | null
    changesPercentage: number | null
    label: string
    price: number | null
    timestamp?: string | null
  }
  extended?: {
    change: number | null
    changesPercentage: number | null
    label: string
    price: number | null
    timestamp?: string | null
  } | null
}

function TickerPriceBlock({
  change,
  changesPercentage,
  currency,
  label,
  price,
  timestamp,
}: {
  change: number | null
  changesPercentage: number | null
  currency?: string | null
  label: string
  price: number | null
  timestamp?: string | null
}) {
  const positive = (change ?? 0) >= 0

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
        <div className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {formatCurrency(price, { currency: currency ?? "USD" })}
        </div>
        <div
          className={cn(
            "text-lg font-medium",
            positive
              ? "text-[color:var(--vesper-teal)]"
              : "text-[color:var(--vesper-orange)]"
          )}
        >
          {formatSignedNumber(change)} ({formatPercent(changesPercentage)})
        </div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">
        {label}
        {timestamp ? ` · ${formatDateTime(timestamp)}` : ""}
      </div>
    </div>
  )
}

export function TickerPriceRail({
  currency,
  current,
  extended,
}: TickerPriceRailProps) {
  return (
    <div className="grid gap-4 border-t border-border/45 pt-5 md:grid-cols-2">
      <TickerPriceBlock
        change={current.change}
        changesPercentage={current.changesPercentage}
        currency={currency}
        label={current.label}
        price={current.price}
        timestamp={current.timestamp}
      />
      {extended ? (
        <div className="border-t border-border/45 pt-4 md:border-t-0 md:border-l md:pl-5 md:pt-0">
          <TickerPriceBlock
            change={extended.change}
            changesPercentage={extended.changesPercentage}
            currency={currency}
            label={extended.label}
            price={extended.price}
            timestamp={extended.timestamp}
          />
        </div>
      ) : null}
    </div>
  )
}

export function TickerActionRow({ items }: { items: TickerActionItem[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) =>
        item.href && !item.disabled ? (
          <Button key={item.label} asChild size="sm" variant="outline">
            <Link href={item.href}>{item.label}</Link>
          </Button>
        ) : (
          <Button
            key={item.label}
            disabled={item.disabled}
            size="sm"
            variant="outline"
          >
            {item.label}
          </Button>
        )
      )}
    </div>
  )
}

export function TickerHeader({
  actions,
  byline,
  currency,
  currentQuote,
  extendedQuote,
  name,
  symbol,
  tabs,
}: {
  actions: TickerActionItem[]
  byline: string
  currency?: string | null
  currentQuote: TickerPriceRailProps["current"]
  extendedQuote?: TickerPriceRailProps["extended"]
  name: string
  symbol: string
  tabs: TickerTabItem[]
}) {
  return (
    <header className="border-b border-border/55">
      <div className="space-y-5 px-4 py-4 sm:px-6 sm:py-5">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {name} ({symbol})
          </h1>
          <div className="text-xs text-muted-foreground uppercase">{byline}</div>
        </div>

        <TickerPriceRail
          currency={currency}
          current={currentQuote}
          extended={extendedQuote}
        />

        <TickerActionRow items={actions} />
      </div>

      <TickerTabNav items={tabs} />
    </header>
  )
}
