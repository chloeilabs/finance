import {
  StockBusinessMixSection,
  StockQualitySection,
} from "@/components/markets/stocks/stock-detail-sections"

import { redirectIfEtfSymbol } from "../stock-route-utils"

export default async function StockMetricsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "metrics")

  return (
    <>
      <StockBusinessMixSection symbol={symbol} />
      <StockQualitySection symbol={symbol} />
    </>
  )
}
