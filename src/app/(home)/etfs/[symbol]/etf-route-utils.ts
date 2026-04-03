import "server-only"

import {
  ETF_TICKER_TAB_LABELS,
  type EtfTickerTab,
  getTickerHref,
} from "@/lib/shared/markets/ticker-routes"

export function buildEtfTickerTabs(symbol: string) {
  return (Object.keys(ETF_TICKER_TAB_LABELS) as EtfTickerTab[]).map((tab) => ({
    exact: tab === "overview",
    href: getTickerHref(symbol, "etf", tab),
    label: ETF_TICKER_TAB_LABELS[tab],
  }))
}
