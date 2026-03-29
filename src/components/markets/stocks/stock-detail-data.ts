import { cache } from "react"

import {
  getStockDossierBusinessSection,
  getStockDossierContextSection,
  getStockDossierFinancialSection,
  getStockDossierStreetViewSection,
  getStockDossierTradingSection,
} from "@/lib/server/markets/service"

export const getTradingSection = cache(getStockDossierTradingSection)
export const getStreetViewSection: typeof getStockDossierStreetViewSection =
  cache(getStockDossierStreetViewSection)
export const getFinancialSection: typeof getStockDossierFinancialSection = cache(
  getStockDossierFinancialSection
)
export const getBusinessSection: typeof getStockDossierBusinessSection = cache(
  getStockDossierBusinessSection
)
export const getContextSection: typeof getStockDossierContextSection = cache(
  getStockDossierContextSection
)
