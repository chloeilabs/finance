import { describe, expect, it } from "vitest"

import {
  getIntradaySparklineMarketDate,
  getIntradaySparklineValuesForDate,
  getLatestAvailableSectorValuations,
  getSparklineIntradayInterval,
  OVERVIEW_BENCHMARK_SYMBOLS,
} from "../service-overview"

describe("service overview intraday sparklines", () => {
  it("includes bitcoin in the home benchmark symbol set", () => {
    expect(OVERVIEW_BENCHMARK_SYMBOLS).toEqual([
      "^GSPC",
      "^IXIC",
      "^DJI",
      "BTCUSD",
    ])
  })

  it("prefers 5 minute bars when available", () => {
    expect(getSparklineIntradayInterval(["1min", "5min", "15min"])).toBe(
      "5min"
    )
  })

  it("falls back through the supported interval order", () => {
    expect(getSparklineIntradayInterval(["30min", "4hour"])).toBe("30min")
    expect(getSparklineIntradayInterval([])).toBeNull()
  })

  it("keeps only bars from the active market date", () => {
    expect(
      getIntradaySparklineValuesForDate(
        [
          {
            close: 198.2,
            date: "2026-04-01 09:35:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: null,
            date: "2026-04-01 09:40:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 201.4,
            date: "2026-04-01 09:45:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 204.1,
            date: "2026-03-31 15:55:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
        ],
        "2026-04-01"
      )
    ).toEqual([198.2, 201.4])
  })

  it("falls back to the latest available market date when today has no bars", () => {
    expect(
      getIntradaySparklineMarketDate(
        [
          {
            close: 4201.5,
            date: "2026-04-02 15:55:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 4198.4,
            date: "2026-04-02 15:50:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 4188.2,
            date: "2026-04-01 15:55:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
        ],
        "2026-04-04"
      )
    ).toBe("2026-04-02")
  })

  it("prefers the requested market date when enough bars exist", () => {
    expect(
      getIntradaySparklineMarketDate(
        [
          {
            close: 67324.71,
            date: "2026-04-04 14:00:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 67280.44,
            date: "2026-04-04 13:55:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
          {
            close: 66890.01,
            date: "2026-04-03 23:55:00",
            high: null,
            low: null,
            open: null,
            volume: null,
          },
        ],
        "2026-04-04"
      )
    ).toBe("2026-04-04")
  })

  it("falls back to the latest sector valuation snapshot with data", async () => {
    const requestedDates: string[] = []

    const result = await getLatestAvailableSectorValuations({
      clock: {
        today: "2026-04-04",
        minusDays(days: number) {
          return ["2026-04-04", "2026-04-03", "2026-04-02"][days] ?? "2026-04-01"
        },
      },
      fetchSnapshot: (date) => {
        requestedDates.push(date)

        if (date === "2026-04-03") {
          return Promise.resolve([
            {
              date,
              exchange: "NASDAQ",
              pe: 32.61,
              sector: "Basic Materials",
            },
          ])
        }

        return Promise.resolve([])
      },
    })

    expect(requestedDates).toEqual(["2026-04-04", "2026-04-03"])
    expect(result).toEqual([
      {
        date: "2026-04-03",
        exchange: "NASDAQ",
        pe: 32.61,
        sector: "Basic Materials",
      },
    ])
  })
})
