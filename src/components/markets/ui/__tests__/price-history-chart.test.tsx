import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PriceHistoryChart } from "../price-history-chart"

describe("PriceHistoryChart", () => {
  it("renders the enhanced chart shell and footer metadata", () => {
    const html = renderToStaticMarkup(
      <PriceHistoryChart
        currency="USD"
        historicalRangeLabel="5 years"
        intradayPoints={[
          { close: 246.2, date: "2026-04-01 09:35:00", high: null, low: null, open: null, volume: null },
          { close: 247.1, date: "2026-04-01 11:35:00", high: null, low: null, open: null, volume: null },
          { close: 248.8, date: "2026-04-01 15:55:00", high: null, low: null, open: null, volume: null },
        ]}
        points={[
          { close: 210, date: "2025-03-27", high: null, low: null, open: null, volume: null },
          { close: 214, date: "2025-05-27", high: null, low: null, open: null, volume: null },
          { close: 219, date: "2025-07-27", high: null, low: null, open: null, volume: null },
          { close: 226, date: "2025-09-27", high: null, low: null, open: null, volume: null },
          { close: 233, date: "2025-11-27", high: null, low: null, open: null, volume: null },
          { close: 241, date: "2026-01-27", high: null, low: null, open: null, volume: null },
          { close: 248.8, date: "2026-03-27", high: null, low: null, open: null, volume: null },
        ]}
        symbol="AAPL"
      />
    )

    expect(html).toContain("Market window")
    expect(html).toContain("Close range")
    expect(html).toContain("Available range")
    expect(html).toContain(">1D<")
    expect(html).toContain("<path")
    expect(html).toContain("<filter")
  })

  it("uses session change stats for the 1D view like a quote-driven finance chart", () => {
    const html = renderToStaticMarkup(
      <PriceHistoryChart
        currentPrice={579.23}
        currency="USD"
        historicalRangeLabel="5 years"
        intradayPoints={[
          { close: 560.27, date: "2026-04-01 09:35:00", high: null, low: null, open: null, volume: null },
          { close: 584.1, date: "2026-04-01 12:35:00", high: null, low: null, open: null, volume: null },
          { close: 579.29, date: "2026-04-01 15:55:00", high: null, low: null, open: null, volume: null },
        ]}
        points={[]}
        sessionChange={7.1}
        sessionChangePercent={1.24}
        symbol="META"
      />
    )

    expect(html).toContain("Session move")
    expect(html).toContain("+7.1")
    expect(html).toContain("1.24%")
    expect(html).toContain("Previous close")
    expect(html).toContain("$572.13")
  })
})
