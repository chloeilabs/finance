import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { TickerHistoryTable } from "../ticker-history-table"

describe("TickerHistoryTable", () => {
  it("renders daily history rows with adjusted close and pagination controls", () => {
    const html = renderToStaticMarkup(
      <TickerHistoryTable
        currency="USD"
        rows={[
          {
            adjustedClose: 191.2,
            changePercent: 1.1,
            close: 191.2,
            date: "2026-04-01",
            high: 192.4,
            low: 188.1,
            open: 189.2,
            volume: 100000,
          },
          {
            adjustedClose: 189.1,
            changePercent: -0.3,
            close: 189.1,
            date: "2026-03-31",
            high: 190.2,
            low: 187.8,
            open: 188.9,
            volume: 120000,
          },
        ]}
      />
    )

    expect(html).toContain("Adj Close")
    expect(html).toContain("Page 1 of 1")
    expect(html).toContain("Mar 31, 2026")
    expect(html).toContain("$191.20")
    expect(html).toContain("1.1%")
    expect(html).toContain("100K")
  })
})
