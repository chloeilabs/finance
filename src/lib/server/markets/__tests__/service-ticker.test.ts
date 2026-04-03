import { describe, expect, it } from "vitest"

import { buildHistoricalPriceRows } from "../service-ticker"

describe("buildHistoricalPriceRows", () => {
  it("builds descending rows and prefers adjusted closes for daily change", () => {
    const rows = buildHistoricalPriceRows([
      {
        adjustedClose: 98,
        close: 98,
        date: "2026-03-31",
        high: 100,
        low: 95,
        open: 96,
        volume: 1000,
      },
      {
        adjustedClose: 100,
        close: 101,
        date: "2026-04-01",
        high: 102,
        low: 97,
        open: 99,
        volume: 1200,
      },
    ])

    expect(rows).toEqual([
      {
        adjustedClose: 100,
        changePercent: (100 - 98) / 98 * 100,
        close: 101,
        date: "2026-04-01",
        high: 102,
        low: 97,
        open: 99,
        volume: 1200,
      },
      {
        adjustedClose: 98,
        changePercent: null,
        close: 98,
        date: "2026-03-31",
        high: 100,
        low: 95,
        open: 96,
        volume: 1000,
      },
    ])
  })
})
