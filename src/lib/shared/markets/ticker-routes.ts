import type { InstrumentKind } from "./core"

export type StockTickerTab =
  | "overview"
  | "financials"
  | "forecast"
  | "statistics"
  | "metrics"
  | "dividends"
  | "history"
  | "profile"
  | "chart"

export type EtfTickerTab =
  | "overview"
  | "holdings"
  | "dividends"
  | "history"
  | "chart"

export const STOCK_TICKER_TAB_LABELS: Record<StockTickerTab, string> = {
  overview: "Overview",
  financials: "Financials",
  forecast: "Forecast",
  statistics: "Statistics",
  metrics: "Metrics",
  dividends: "Dividends",
  history: "History",
  profile: "Profile",
  chart: "Chart",
}

export const ETF_TICKER_TAB_LABELS: Record<EtfTickerTab, string> = {
  overview: "Overview",
  holdings: "Holdings",
  dividends: "Dividends",
  history: "History",
  chart: "Chart",
}

export function getTickerBasePath(symbol: string, kind: InstrumentKind) {
  const normalized = encodeURIComponent(symbol.trim().toUpperCase())
  const basePath = kind === "etf" ? "/etfs" : "/stocks"

  return `${basePath}/${normalized}`
}

export function getTickerHref(
  symbol: string,
  kind: InstrumentKind,
  tab: StockTickerTab | EtfTickerTab = "overview"
) {
  const basePath = getTickerBasePath(symbol, kind)

  return tab === "overview" ? basePath : `${basePath}/${tab}`
}
