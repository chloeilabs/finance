import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PortfolioOverview } from "../portfolio-overview"

describe("PortfolioOverview", () => {
  it("renders the mobile two-row summary grid", () => {
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

    expect(html).toContain("grid-cols-3")
    expect(html).toContain("sm:grid-cols-6")
    expect(html).toContain("Total Value")
    expect(html).toContain("Day P/L")
    expect(html).toContain("Total P/L")
    expect(html).toContain("Cash")
    expect(html).toContain("Income")
    expect(html).not.toContain("Income Yield")
    expect(html).toContain("Holdings")
    expect(html).toContain("$94.50")
    expect(html).toContain("3.15% yield")
  })
})
