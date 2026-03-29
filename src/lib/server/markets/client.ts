import "server-only"

import { createCompanyClient } from "./client/company"
import { createDirectoryClient } from "./client/directory"
import { createFundamentalsClient } from "./client/fundamentals"
import { createMarketStructureClient } from "./client/market-structure"
import { createPriceDataClient } from "./client/price-data"
import { createQuotesClient } from "./client/quotes"
import { createReferenceDataClient } from "./client/reference-data"
import { createResearchClient } from "./client/research"

export { fetchFmpJson, FmpRequestError } from "./fmp-request"

export function createFmpClient() {
  const priceData = createPriceDataClient()
  const research = createResearchClient()
  const referenceData = createReferenceDataClient()
  const marketStructure = createMarketStructureClient()

  return {
    directory: createDirectoryClient(),
    quotes: createQuotesClient(),
    charts: priceData.charts,
    technicals: priceData.technicals,
    company: createCompanyClient(),
    fundamentals: createFundamentalsClient(),
    calendar: research.calendar,
    news: research.news,
    analyst: research.analyst,
    filings: research.filings,
    ownership: referenceData.ownership,
    insider: referenceData.insider,
    etf: referenceData.etf,
    valuation: referenceData.valuation,
    macro: marketStructure.macro,
    marketStructure: marketStructure.marketStructure,
    breadth: marketStructure.breadth,
  }
}
