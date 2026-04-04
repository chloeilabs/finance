import type { InstrumentKind } from "./core"

export interface PortfolioRecord {
  id: string
  name: string
  baseCurrency: string
  cashBalance: number
  createdAt: string
  updatedAt: string
}

export interface PortfolioHoldingRecord {
  id: string
  symbol: string
  shares: number
  averageCost: number
  targetWeight: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface PortfolioHoldingFormInput {
  symbol: string
  shares: number
  averageCost: number
  targetWeight?: number | null
  notes?: string | null
}

export interface PortfolioSummary {
  totalValue: number
  investedValue: number
  totalCostBasis: number
  cashBalance: number
  dayChangeValue: number
  dayChangePercent: number | null
  unrealizedGainLoss: number
  unrealizedGainLossPercent: number | null
  holdingCount: number
  topPositionConcentration: number | null
}

export interface PortfolioAllocationBucket {
  label: string
  value: number
  weight: number
}

export interface PortfolioHoldingView extends PortfolioHoldingRecord {
  instrumentKind: InstrumentKind
  name: string | null
  currency: string | null
  sector: string | null
  price: number | null
  marketValue: number
  costBasis: number
  dayChangeValue: number | null
  dayChangePercent: number | null
  unrealizedGainLoss: number
  unrealizedGainLossPercent: number | null
  weight: number | null
  nextEarningsDate: string | null
  dividendYieldTtm: number | null
  analystConsensus: string | null
}

export interface PortfolioPageData {
  portfolio: PortfolioRecord
  summary: PortfolioSummary
  holdings: PortfolioHoldingView[]
  sectorAllocations: PortfolioAllocationBucket[]
  instrumentAllocations: PortfolioAllocationBucket[]
}
