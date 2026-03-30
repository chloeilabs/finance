import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PriceHistoryChart } from "../price-history-chart"

describe("PriceHistoryChart", () => {
  it("renders the enhanced chart shell and footer metadata", () => {
    const html = renderToStaticMarkup(
      <PriceHistoryChart
        currency="USD"
        historicalRangeLabel="5 years"
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
    expect(html).toContain("<path")
    expect(html).toContain("<filter")
  })
})
