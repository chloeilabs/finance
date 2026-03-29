import "server-only"

import {
  FMP_PLAN_TIERS,
  type FmpCapabilities,
  type FmpCapabilityKey,
  type FmpCoverageScope,
  type FmpIntradayInterval,
  type FmpPlanTier,
  type MarketPlanSummary,
} from "@/lib/shared/markets/plan"

const DEFAULT_FMP_BASE_URL = "https://financialmodelingprep.com"
const FMP_PLAN_TIER_SET = new Set<FmpPlanTier>(FMP_PLAN_TIERS)
const STARTER_INTRADAY_INTERVALS: FmpIntradayInterval[] = [
  "5min",
  "15min",
  "30min",
  "1hour",
  "4hour",
]
const PREMIUM_INTRADAY_INTERVALS: FmpIntradayInterval[] = [
  "1min",
  "5min",
  "15min",
  "30min",
  "1hour",
  "4hour",
]

// This matrix follows the public pricing/docs pages and the live Starter-key
// validation run on March 28, 2026. When FMP plan behavior changes, refresh the
// assumptions with `pnpm markets:capabilities`.
const PLAN_CAPABILITIES: Record<FmpPlanTier, FmpCapabilities> = {
  STARTER: {
    realtimeQuotes: true,
    intradayCharts: true,
    batchQuotes: false,
    batchIndexQuotes: false,
    analystInsights: true,
    insiderTrades: false,
    ownership: false,
    etfAssetExposure: false,
    secFilings: true,
    economics: true,
    esgRatings: false,
    dcf: true,
    earningsTranscripts: false,
    pressReleases: false,
    globalCoverage: false,
    coverageScope: "us",
    intradayIntervals: STARTER_INTRADAY_INTERVALS,
  },
  PREMIUM: {
    realtimeQuotes: true,
    intradayCharts: true,
    batchQuotes: false,
    batchIndexQuotes: false,
    analystInsights: true,
    insiderTrades: true,
    ownership: false,
    etfAssetExposure: false,
    secFilings: true,
    economics: true,
    esgRatings: false,
    dcf: true,
    earningsTranscripts: false,
    pressReleases: true,
    globalCoverage: false,
    coverageScope: "usUkCanada",
    intradayIntervals: PREMIUM_INTRADAY_INTERVALS,
  },
  ULTIMATE: {
    realtimeQuotes: true,
    intradayCharts: true,
    batchQuotes: true,
    batchIndexQuotes: true,
    analystInsights: true,
    insiderTrades: true,
    ownership: true,
    etfAssetExposure: true,
    secFilings: true,
    economics: true,
    esgRatings: true,
    dcf: true,
    earningsTranscripts: true,
    pressReleases: true,
    globalCoverage: true,
    coverageScope: "global",
    intradayIntervals: PREMIUM_INTRADAY_INTERVALS,
  },
}

function getQuoteFreshnessLabelForTier(): string {
  return "Real-time"
}

function getHistoricalRangeLabelForTier(tier: FmpPlanTier): string {
  switch (tier) {
    case "STARTER":
      return "5 years"
    case "PREMIUM":
      return "30+ years"
    case "ULTIMATE":
      return "Full history"
  }
}

function getRequestBudgetLabelForTier(tier: FmpPlanTier): string {
  switch (tier) {
    case "STARTER":
      return "300 calls / minute"
    case "PREMIUM":
      return "750 calls / minute"
    case "ULTIMATE":
      return "3,000 calls / minute"
  }
}

function getBandwidthLimitLabelForTier(tier: FmpPlanTier): string {
  switch (tier) {
    case "STARTER":
      return "20 GB / 30 days"
    case "PREMIUM":
      return "50 GB / 30 days"
    case "ULTIMATE":
      return "150 GB / 30 days"
  }
}

export function getConfiguredFmpApiKey(): string | null {
  const value = process.env.FMP_API_KEY?.trim()

  if (!value) {
    return null
  }

  return value
}

export function isFmpConfigured(): boolean {
  return getConfiguredFmpApiKey() !== null
}

export function getRequiredFmpApiKey(): string {
  const apiKey = getConfiguredFmpApiKey()

  if (!apiKey) {
    throw new Error("Missing FMP_API_KEY.")
  }

  return apiKey
}

export function getFmpBaseUrl(): string {
  const value = process.env.FMP_BASE_URL?.trim()

  if (!value) {
    return DEFAULT_FMP_BASE_URL
  }

  return value.replace(/\/+$/, "")
}

export function getFmpPlanTier(): FmpPlanTier {
  const candidate = process.env.FMP_PLAN_TIER?.trim().toUpperCase()

  if (candidate && FMP_PLAN_TIER_SET.has(candidate as FmpPlanTier)) {
    return candidate as FmpPlanTier
  }

  return "STARTER"
}

export function getFmpCapabilities(): FmpCapabilities {
  return PLAN_CAPABILITIES[getFmpPlanTier()]
}

export function getFmpCoverageScope(): FmpCoverageScope {
  return getFmpCapabilities().coverageScope
}

export function getFmpIntradayIntervals(): FmpIntradayInterval[] {
  return getFmpCapabilities().intradayIntervals
}

export function getWatchlistLimitForTier(tier: FmpPlanTier): number {
  switch (tier) {
    case "STARTER":
      return 75
    case "PREMIUM":
      return 150
    case "ULTIMATE":
      return 300
  }
}

export function getMarketPlanSummary(): MarketPlanSummary {
  const tier = getFmpPlanTier()

  return {
    tier,
    label: tier.charAt(0) + tier.slice(1).toLowerCase(),
    quoteFreshnessLabel: getQuoteFreshnessLabelForTier(),
    historicalRangeLabel: getHistoricalRangeLabelForTier(tier),
    requestBudgetLabel: getRequestBudgetLabelForTier(tier),
    bandwidthLimitLabel: getBandwidthLimitLabelForTier(tier),
    watchlistLimit: getWatchlistLimitForTier(tier),
    capabilities: PLAN_CAPABILITIES[tier],
  }
}

export function getQuoteCacheTtlSeconds(): number {
  return 60
}

export function getFmpSoftMinuteLimit(): number {
  switch (getFmpPlanTier()) {
    case "STARTER":
      return 240
    case "PREMIUM":
      return 600
    case "ULTIMATE":
      return 2400
  }
}

export function isCapabilityEnabled(capability: FmpCapabilityKey): boolean {
  return getFmpCapabilities()[capability]
}
