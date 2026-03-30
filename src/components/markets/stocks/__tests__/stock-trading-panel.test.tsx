import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { StockTradingPanel } from "../stock-trading-panel"

describe("StockTradingPanel", () => {
  it("renders the intraday trading chart without an endpoint marker", () => {
    const html = renderToStaticMarkup(
      <StockTradingPanel
        currency="USD"
        intradayCharts={{
          "5min": [
            {
              close: 249.1,
              date: "2026-03-29 13:00:00",
              high: null,
              low: null,
              open: null,
              volume: null,
            },
            {
              close: 248.7,
              date: "2026-03-29 13:05:00",
              high: null,
              low: null,
              open: null,
              volume: null,
            },
            {
              close: 248.8,
              date: "2026-03-29 13:10:00",
              high: null,
              low: null,
              open: null,
              volume: null,
            },
          ],
        }}
        aftermarket={{
          askPrice: 248.82,
          bidPrice: 248.76,
          lastTradePrice: 248.8,
          lastTradeTimestamp: "2026-03-29T18:10:00.000Z",
          quoteTimestamp: "2026-03-29T18:10:00.000Z",
          volume: null,
        }}
        priceChange={{
          day1: -1.62,
          day5: -2.04,
          max: null,
          month1: -5.82,
          month3: -9.12,
          month6: -2.21,
          year1: 12.01,
          year10: null,
          year3: null,
          year5: null,
          ytd: -8.2,
        }}
        technicals={[
          {
            id: "sma20",
            label: "SMA 20",
            points: [{ date: "2026-03-29", value: 255.38 }],
          },
        ]}
      />
    )

    expect(html).toContain("Intraday")
    expect(html).toContain("<svg")
    expect(html).toContain("<path")
    expect(html).not.toContain("<circle")
  })
})
