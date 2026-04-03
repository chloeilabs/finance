import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { PriceHistoryChart } from "../price-history-chart"

describe("PriceHistoryChart", () => {
  it("renders a stockanalysis-style chart block with timeframe controls and plain price labels", () => {
    const html = renderToStaticMarkup(
      <PriceHistoryChart
        currency="USD"
        historicalRangeLabel="5 years"
        intradayPoints={[
          {
            close: 246.2,
            date: "2026-04-01 09:35:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 247.1,
            date: "2026-04-01 11:35:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 248.8,
            date: "2026-04-01 15:55:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
        ]}
        points={[
          {
            close: 210,
            date: "2025-03-27",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 214,
            date: "2025-05-27",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 219,
            date: "2025-07-27",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 226,
            date: "2025-09-27",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 233,
            date: "2025-11-27",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 241,
            date: "2026-01-27",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 248.8,
            date: "2026-03-27",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
        ]}
        symbol="AAPL"
      />
    )

    expect(html).toContain("Price history timeframe")
    expect(html).toContain(">1D<")
    expect(html).toContain(">YTD<")
    expect(html).toContain(">5Y<")
    expect(html).toContain(">Max<")
    expect(html).toContain("+1.06% (1D)")
    expect(html).toContain("#059669")
    expect(html).toContain("9:35 am")
    expect(html).toContain("3:55 pm")
    expect(html).toContain("248.80")
    expect(html).not.toContain("Market window")
    expect(html).not.toContain("Entry close")
    expect(html).not.toContain("Latest close")
    expect(html).not.toContain("Gain / share")
    expect(html).not.toContain("Total return")
    expect(html).toContain("<path")
    expect(html).toContain("<filter")
    expect(html.match(/<linearGradient/g)?.length).toBe(2)
  })

  it("uses quote session stats for the 1D badge and end price marker", () => {
    const html = renderToStaticMarkup(
      <PriceHistoryChart
        currentPrice={579.23}
        currency="USD"
        historicalRangeLabel="5 years"
        intradayPoints={[
          {
            close: 560.27,
            date: "2026-04-01 09:35:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 584.1,
            date: "2026-04-01 12:35:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 579.29,
            date: "2026-04-01 15:55:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
        ]}
        points={[]}
        sessionChange={7.1}
        sessionChangePercent={1.24}
        symbol="META"
      />
    )

    expect(html).toContain("+1.24% (1D)")
    expect(html).toContain("579.23")
    expect(html).toContain("560.27")
    expect(html).toContain("12:35 pm")
    expect(html).not.toContain("Session move")
    expect(html).not.toContain("Last trade")
  })
})
