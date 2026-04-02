import { describe, expect, it } from "vitest"

import {
  getIntradaySparklineValuesForDate,
  getSparklineIntradayInterval,
} from "../service-overview"

describe("service overview intraday sparklines", () => {
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
})
