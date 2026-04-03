import { notFound } from "next/navigation"

import { TickerHeader } from "@/components/markets/ticker/ticker-header"
import { getEtfDossier } from "@/lib/server/markets/service"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"

import { buildEtfTickerTabs } from "./etf-route-utils"

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

export default async function EtfTickerLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params
  const dossier = await getEtfDossier(symbol)

  if (!dossier.info && !dossier.quote) {
    notFound()
  }

  const name = dossier.info?.name ?? dossier.quote?.name ?? dossier.symbol
  const exchange = dossier.info?.exchange ?? dossier.quote?.exchange ?? "ETF"
  const currency = dossier.info?.currency ?? dossier.quote?.currency ?? "USD"

  return (
    <div className="pb-10">
      <TickerHeader
        actions={[
          {
            href: getTickerHref(dossier.symbol, "etf", "chart"),
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
        byline={`${exchange}: ${dossier.symbol} · ETF · ${currency}`}
        currency={currency}
        currentQuote={{
          change: dossier.quote?.change ?? null,
          changesPercentage: dossier.quote?.changesPercentage ?? null,
          label: "Regular session",
          price: dossier.quote?.price ?? null,
          timestamp: dossier.quote?.timestamp ?? null,
        }}
        extendedQuote={buildExtendedQuote({
          currentPrice: dossier.quote?.price,
          lastTradePrice: dossier.aftermarket?.lastTradePrice,
          timestamp: dossier.aftermarket?.lastTradeTimestamp,
        })}
        name={name}
        symbol={dossier.symbol}
        tabs={buildEtfTickerTabs(dossier.symbol)}
      />
      {children}
    </div>
  )
}
