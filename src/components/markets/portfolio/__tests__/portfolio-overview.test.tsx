import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PortfolioOverview } from "../portfolio-overview"

describe("PortfolioOverview", () => {
  it("renders a weighted average dividend yield card", () => {
    const html = renderToStaticMarkup(
      <PortfolioOverview
        summary={{
          cashBalance: 500,
          dayChangePercent: 0.012,
          dayChangeValue: 36,
          holdingCount: 3,
          investedValue: 3000,
          topPositionConcentration: 0.4,
          totalCostBasis: 2800,
          totalValue: 3500,
          unrealizedGainLoss: 200,
          unrealizedGainLossPercent: 200 / 2800,
          weightedAverageDividendYield: 0.0315,
        }}
      />
    )

    expect(html).toContain("Weighted Avg Dividend Yield")
    expect(html).toContain("3.15%")
  })
})
