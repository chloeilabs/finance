import { notFound } from "next/navigation"

import { TickerHeader } from "@/components/markets/ticker/ticker-header"
import {
  getStockDossierOverview,
  getStockDossierTradingSection,
} from "@/lib/server/markets/service"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"

import { buildStockTickerTabs } from "./stock-route-utils"

function buildExtendedQuote(params: {
  currentPrice: number | null | undefined
  lastTradePrice: number | null | undefined
  timestamp?: string | null
}) {
  const currentPrice = params.currentPrice ?? null
  const lastTradePrice = params.lastTradePrice ?? null

  if (currentPrice === null || lastTradePrice === null) {
    return null
  }

  const change = lastTradePrice - currentPrice

  return {
    change,
    changesPercentage: currentPrice === 0 ? null : (change / currentPrice) * 100,
    label: "Extended hours",
    price: lastTradePrice,
    timestamp: params.timestamp ?? null,
  }
}

export default async function StockTickerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  const [overview, trading] = await Promise.all([
    getStockDossierOverview(symbol),
    getStockDossierTradingSection(symbol),
  ])

  if (!overview.profile && !overview.quote) {
    notFound()
  }

  const name = overview.profile?.companyName ?? overview.quote?.name ?? overview.symbol
  const exchange =
    overview.profile?.exchangeShortName ?? overview.quote?.exchange ?? "STOCK"
  const currency = overview.quote?.currency ?? "USD"

  return (
    <div className="pb-10">
      <TickerHeader
        actions={[
          {
            href: getTickerHref(overview.symbol, "stock", "chart"),
            label: "Full Chart",
          },
          {
            disabled: true,
            label: "Watchlist",
          },
          {
            disabled: true,
            label: "Compare",
          },
        ]}
        byline={`${exchange}: ${overview.symbol} · Real-time Price · ${currency}`}
        currency={overview.quote?.currency}
        currentQuote={{
          change: overview.quote?.change ?? null,
          changesPercentage: overview.quote?.changesPercentage ?? null,
          label: "Regular session",
          price: overview.quote?.price ?? null,
          timestamp: overview.quote?.timestamp ?? null,
        }}
        extendedQuote={buildExtendedQuote({
          currentPrice: overview.quote?.price,
          lastTradePrice: trading.aftermarket?.lastTradePrice,
          timestamp: trading.aftermarket?.lastTradeTimestamp,
        })}
        name={name}
        symbol={overview.symbol}
        tabs={buildStockTickerTabs(overview.symbol)}
      />
      {children}
    </div>
  )
}
