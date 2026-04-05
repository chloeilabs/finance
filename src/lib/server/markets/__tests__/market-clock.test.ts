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

  it("agrees with UTC during normal daytime hours", () => {
    const clock = createMarketDateClock(new Date("2026-06-10T16:00:00.000Z"))

    expect(clock.today).toBe("2026-06-10")
  })

  it("resolves the correct date across the EDT/EST boundary at the same UTC time", () => {
    // 04:30 UTC during EDT (summer): NY local = 00:30 AM same day
    expect(getMarketTodayIsoDate(new Date("2026-07-15T04:30:00.000Z"))).toBe(
      "2026-07-15"
    )

    // 04:30 UTC during EST (winter): NY local = 23:30 PM previous day
    expect(getMarketTodayIsoDate(new Date("2026-01-15T04:30:00.000Z"))).toBe(
      "2026-01-14"
    )
  })

  it("shifts across month boundaries with minusDays", () => {
    const clock = createMarketDateClock(new Date("2026-05-03T14:00:00.000Z"))

    expect(clock.today).toBe("2026-05-03")
    expect(clock.minusDays(5)).toBe("2026-04-28")
    expect(clock.plusDays(29)).toBe("2026-06-01")
  })
})
