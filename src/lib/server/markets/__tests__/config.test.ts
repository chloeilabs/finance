import { afterEach, describe, expect, it } from "vitest"

import {
  getFmpCapabilities,
  getFmpPlanTier,
  getFmpPlanValidationSummary,
  getMarketPlanSummary,
} from "../config"

const originalPlanTier = process.env.FMP_PLAN_TIER

afterEach(() => {
  if (originalPlanTier === undefined) {
    delete process.env.FMP_PLAN_TIER
  } else {
    process.env.FMP_PLAN_TIER = originalPlanTier
  }
})

describe("market plan capabilities", () => {
  it("defaults to the validated Starter matrix", () => {
    process.env.FMP_PLAN_TIER = "STARTER"

    expect(getFmpPlanTier()).toBe("STARTER")
    expect(getFmpCapabilities()).toMatchObject({
      analystInsights: true,
      batchIndexQuotes: false,
      batchQuotes: false,
      commodityMarkets: true,
      companyExecutives: true,
      cryptoMarkets: true,
      dcf: true,
      earningsTranscripts: false,
      economics: true,
      esgRatings: false,
      etfAssetExposure: false,
      forexMarkets: true,
      insiderTrades: false,
      intradayCharts: true,
      latestInsiderFeed: true,
      ownership: false,
      pressReleases: false,
      secFilings: true,
      shareFloatLiquidity: true,
      technicalIndicators: true,
    })
  })

  it("uses validated capabilities in the market plan summary", () => {
    process.env.FMP_PLAN_TIER = "STARTER"

    const summary = getMarketPlanSummary()

    expect(summary.tier).toBe("STARTER")
    expect(summary.capabilities).toMatchObject({
      companyExecutives: true,
      latestInsiderFeed: true,
      shareFloatLiquidity: true,
      technicalIndicators: true,
    })
  })

  it("exposes the validation snapshot metadata for the active plan", () => {
    process.env.FMP_PLAN_TIER = "STARTER"

    const validation = getFmpPlanValidationSummary()

    expect(validation?.tier).toBe("STARTER")
    expect(typeof validation?.source).toBe("string")
    expect(typeof validation?.validatedAt).toBe("string")
  })
})
