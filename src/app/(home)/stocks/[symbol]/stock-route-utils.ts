import "server-only"

import { redirect } from "next/navigation"

import { resolveTickerInstrumentKind } from "@/lib/server/markets/service"
import {
  getTickerHref,
  STOCK_TICKER_TAB_LABELS,
  type StockTickerTab,
} from "@/lib/shared/markets/ticker-routes"

export async function redirectIfEtfSymbol(
  symbol: string,
  tab: StockTickerTab = "overview"
) {
  const instrumentKind = await resolveTickerInstrumentKind(symbol)

  if (instrumentKind === "etf") {
    const etfTab =
      tab === "dividends" || tab === "history" || tab === "chart"
        ? tab
        : "overview"

    redirect(getTickerHref(symbol, "etf", etfTab))
  }
}

export function buildStockTickerTabs(symbol: string) {
  return (Object.keys(STOCK_TICKER_TAB_LABELS) as StockTickerTab[]).map((tab) => ({
    exact: tab === "overview",
    href: getTickerHref(symbol, "stock", tab),
    label: STOCK_TICKER_TAB_LABELS[tab],
  }))
}
