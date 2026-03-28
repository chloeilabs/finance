import "server-only"

import {
  FMP_PLAN_TIERS,
  type FmpCapabilities,
  type FmpPlanTier,
  type MarketPlanSummary,
} from "@/lib/shared"

const DEFAULT_FMP_BASE_URL = "https://financialmodelingprep.com"
const FMP_PLAN_TIER_SET = new Set<FmpPlanTier>(FMP_PLAN_TIERS)

const PLAN_CAPABILITIES: Record<FmpPlanTier, FmpCapabilities> = {
  BASIC: {
    realtimeQuotes: false,
    intradayCharts: false,
    analystInsights: false,
    insiderTrades: false,
    ownership: false,
    etfHoldings: false,
    secFilings: true,
    economics: true,
    esg: false,
    dcf: false,
    earningsTranscripts: false,
    globalCoverage: false,
  },
  STARTER: {
    realtimeQuotes: true,
    intradayCharts: true,
    analystInsights: true,
    insiderTrades: true,
    ownership: false,
    etfHoldings: true,
    secFilings: true,
    economics: true,
    esg: true,
    dcf: true,
    earningsTranscripts: false,
    globalCoverage: false,
  },
  PREMIUM: {
    realtimeQuotes: true,
    intradayCharts: true,
    analystInsights: true,
    insiderTrades: true,
    ownership: true,
    etfHoldings: true,
    secFilings: true,
    economics: true,
    esg: true,
    dcf: true,
    earningsTranscripts: true,
    globalCoverage: true,
  },
  ULTIMATE: {
    realtimeQuotes: true,
    intradayCharts: true,
    analystInsights: true,
    insiderTrades: true,
    ownership: true,
    etfHoldings: true,
    secFilings: true,
    economics: true,
    esg: true,
    dcf: true,
    earningsTranscripts: true,
    globalCoverage: true,
  },
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

  return "BASIC"
}

export function getFmpCapabilities(): FmpCapabilities {
  return PLAN_CAPABILITIES[getFmpPlanTier()]
}

export function getWatchlistLimitForTier(tier: FmpPlanTier): number {
  switch (tier) {
    case "BASIC":
      return 25
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
    quoteFreshnessLabel:
      tier === "BASIC" ? "End of day / delayed" : "Real-time",
    historicalRangeLabel:
      tier === "BASIC" || tier === "STARTER" ? "5 years" : "30+ years",
    requestBudgetLabel:
      tier === "BASIC"
        ? "250 calls / day"
        : tier === "STARTER"
          ? "300 calls / minute"
          : tier === "PREMIUM"
            ? "750 calls / minute"
            : "3,000+ calls / minute",
    watchlistLimit: getWatchlistLimitForTier(tier),
    capabilities: PLAN_CAPABILITIES[tier],
  }
}

export function getQuoteCacheTtlSeconds(): number {
  return getFmpPlanTier() === "BASIC" ? 60 * 10 : 60
}

export function isCapabilityEnabled(
  capability: keyof FmpCapabilities
): boolean {
  return getFmpCapabilities()[capability]
}
