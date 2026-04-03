import { StockFinancialSection } from "@/components/markets/stocks/stock-detail-sections"

import { redirectIfEtfSymbol } from "../stock-route-utils"

export default async function StockFinancialsPage({
  params,
}: {
  params: Promise<{ symbol: string }>
}) {
  const { symbol } = await params

  await redirectIfEtfSymbol(symbol, "financials")

  return <StockFinancialSection symbol={symbol} />
}
