import { describe, expect, it } from "vitest"

import { selectUpcomingMarketHolidays } from "../market-holidays"

describe("market holiday selection", () => {
  it("falls back to a projected schedule when FMP returns only past holidays", () => {
    expect(
      selectUpcomingMarketHolidays({
        exchange: "NASDAQ",
        items: [
          {
            adjCloseTime: null,
            adjOpenTime: null,
            date: "2026-04-03",
            exchange: "NASDAQ",
            isClosed: true,
            name: "Good Friday",
          },
          {
            adjCloseTime: null,
            adjOpenTime: null,
            date: "2026-02-16",
            exchange: "NASDAQ",
            isClosed: true,
            name: "Washington's Birthday",
          },
        ],
        today: "2026-04-04",
      })
    ).toEqual([
      {
        adjCloseTime: null,
        adjOpenTime: null,
        date: "2026-05-25",
        exchange: "NASDAQ",
        isClosed: true,
        name: "Memorial Day",
      },
      {
        adjCloseTime: null,
        adjOpenTime: null,
        date: "2026-06-19",
        exchange: "NASDAQ",
        isClosed: true,
        name: "Juneteenth National Independence Day",
      },
    ])
  })

  it("uses live future holidays when the provider supplies them", () => {
    expect(
      selectUpcomingMarketHolidays({
        exchange: "NYSE",
        items: [
          {
            adjCloseTime: null,
            adjOpenTime: null,
            date: "2026-05-25",
            exchange: "NYSE",
            isClosed: true,
            name: "Memorial Day",
          },
          {
            adjCloseTime: null,
            adjOpenTime: null,
            date: "2026-06-19",
            exchange: "NYSE",
            isClosed: true,
            name: "Juneteenth National Independence Day",
          },
        ],
        today: "2026-04-04",
      })
    ).toEqual([
      {
        adjCloseTime: null,
        adjOpenTime: null,
        date: "2026-05-25",
        exchange: "NYSE",
        isClosed: true,
        name: "Memorial Day",
      },
      {
        adjCloseTime: null,
        adjOpenTime: null,
        date: "2026-06-19",
        exchange: "NYSE",
        isClosed: true,
        name: "Juneteenth National Independence Day",
      },
    ])
  })
})
