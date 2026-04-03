import { StockStreetViewSection } from "@/components/markets/stocks/stock-detail-sections"

import { redirectIfEtfSymbol } from "../stock-route-utils"

export default async function StockForecastPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "forecast")

  return <StockStreetViewSection symbol={symbol} />
}
