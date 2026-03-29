export const FMP_PLAN_TIERS = ["STARTER", "PREMIUM", "ULTIMATE"] as const

export type FmpPlanTier = (typeof FMP_PLAN_TIERS)[number]

export const FMP_INTRADAY_INTERVALS = [
  "1min",
  "5min",
  "15min",
  "30min",
  "1hour",
  "4hour",
] as const

export type FmpIntradayInterval = (typeof FMP_INTRADAY_INTERVALS)[number]

export type FmpCoverageScope = "us" | "usUkCanada" | "global"

export const FMP_CAPABILITY_KEYS = [
  "realtimeQuotes",
  "intradayCharts",
  "batchQuotes",
  "batchIndexQuotes",
  "analystInsights",
  "insiderTrades",
  "ownership",
  "etfAssetExposure",
  "secFilings",
  "economics",
  "esgRatings",
  "dcf",
  "earningsTranscripts",
  "pressReleases",
  "globalCoverage",
] as const

export type FmpCapabilityKey = (typeof FMP_CAPABILITY_KEYS)[number]

export interface FmpCapabilities {
  realtimeQuotes: boolean
  intradayCharts: boolean
  batchQuotes: boolean
  batchIndexQuotes: boolean
  analystInsights: boolean
  insiderTrades: boolean
  ownership: boolean
  etfAssetExposure: boolean
  secFilings: boolean
  economics: boolean
  esgRatings: boolean
  dcf: boolean
  earningsTranscripts: boolean
  pressReleases: boolean
  globalCoverage: boolean
  coverageScope: FmpCoverageScope
  intradayIntervals: FmpIntradayInterval[]
}

export interface MarketPlanSummary {
  tier: FmpPlanTier
  label: string
  quoteFreshnessLabel: string
  historicalRangeLabel: string
  requestBudgetLabel: string
  bandwidthLimitLabel: string
  watchlistLimit: number
  capabilities: FmpCapabilities
}
