import { describe, expect, it } from "vitest"

import {
  createMarketDateClock,
  getMarketTodayIsoDate,
} from "../market-clock"

describe("market clock", () => {
  it("uses New York day boundaries instead of UTC late at night", () => {
    const clock = createMarketDateClock(new Date("2026-03-29T03:30:00.000Z"))

    expect(clock.today).toBe("2026-03-28")
    expect(clock.plusDays(1)).toBe("2026-03-29")
    expect(clock.minusDays(1)).toBe("2026-03-27")
  })

  it("handles UTC year rollover from the prior market day", () => {
    expect(getMarketTodayIsoDate(new Date("2026-01-01T03:30:00.000Z"))).toBe(
      "2025-12-31"
    )
  })
})
