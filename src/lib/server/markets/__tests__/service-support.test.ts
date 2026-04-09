import { describe, expect, it } from "vitest"

import type {
  CalendarEvent,
  MetricStat,
  NewsStory,
  StatementTable,
} from "@/lib/shared/markets/core"

import {
  buildLockedSection,
  compactMetricStats,
  compactTables,
  dedupeCalendarEvents,
  dedupeNews,
  getEodChartCacheKey,
  getIntradayChartCacheKey,
  getMetricNumberByLabel,
  getQuoteCacheKey,
  mapWithConcurrency,
  normalizeSymbol,
  normalizeSymbols,
} from "../service-support"

describe("normalizeSymbol", () => {
  it("uppercases a lowercase symbol", () => {
    expect(normalizeSymbol("aapl")).toBe("AAPL")
  })

  it("trims whitespace", () => {
    expect(normalizeSymbol("  msft  ")).toBe("MSFT")
  })

  it("handles mixed case with whitespace", () => {
    expect(normalizeSymbol(" GoOgL ")).toBe("GOOGL")
  })
})

describe("normalizeSymbols", () => {
  it("normalizes and deduplicates symbols", () => {
    expect(normalizeSymbols(["aapl", "AAPL", "msft"])).toEqual([
      "AAPL",
      "MSFT",
    ])
  })

  it("filters out empty strings after trimming", () => {
    expect(normalizeSymbols(["aapl", "  ", "msft"])).toEqual(["AAPL", "MSFT"])
  })

  it("returns an empty array for empty input", () => {
    expect(normalizeSymbols([])).toEqual([])
  })
})

describe("mapWithConcurrency", () => {
  it("returns an empty array for empty input", async () => {
    const result = await mapWithConcurrency([], 4, (x) => Promise.resolve(x))
    expect(result).toEqual([])
  })

  it("maps all items preserving order", async () => {
    const items = [1, 2, 3, 4, 5]
    const result = await mapWithConcurrency(items, 2, (x) =>
      Promise.resolve(x * 10)
    )
    expect(result).toEqual([10, 20, 30, 40, 50])
  })

  it("respects the concurrency limit", async () => {
    let maxConcurrent = 0
    let current = 0

    const items = [1, 2, 3, 4, 5, 6]
    await mapWithConcurrency(items, 2, async (x) => {
      current += 1
      maxConcurrent = Math.max(maxConcurrent, current)
      await new Promise((r) => {
        r(undefined)
      })
      current -= 1
      return x
    })

    expect(maxConcurrent).toBeLessThanOrEqual(2)
    expect(maxConcurrent).toBe(2)
  })

  it("passes the index to the mapper", async () => {
    const items = ["a", "b", "c"]
    const indices: number[] = []
    await mapWithConcurrency(items, 3, (_, i) => {
      indices.push(i)
      return Promise.resolve()
    })
    expect(indices).toEqual([0, 1, 2])
  })
})

describe("buildLockedSection", () => {
  it("returns a LockedMarketSection with the given fields", () => {
    const section = buildLockedSection(
      "Insider Trading",
      "insider_trading",
      "Requires premium."
    )
    expect(section).toEqual({
      title: "Insider Trading",
      capability: "insider_trading",
      description: "Requires premium.",
    })
  })
})

describe("compactMetricStats", () => {
  it("flattens groups and removes entries with null values", () => {
    const groups: MetricStat[][] = [
      [
        { label: "PE", value: 25 },
        { label: "PB", value: null },
      ],
      [{ label: "ROE", value: 0.15 }],
    ]
    const result = compactMetricStats(groups)
    expect(result).toEqual([
      { label: "PE", value: 25 },
      { label: "ROE", value: 0.15 },
    ])
  })

  it("returns empty array for empty input", () => {
    expect(compactMetricStats([])).toEqual([])
  })
})

describe("compactTables", () => {
  it("removes null entries", () => {
    const tables: (StatementTable | null)[] = [
      { title: "Income", headers: [], rows: [] },
      null,
      { title: "Balance", headers: [], rows: [] },
    ]
    const result = compactTables(tables)
    expect(result).toHaveLength(2)
    expect(result[0]?.title).toBe("Income")
    expect(result[1]?.title).toBe("Balance")
  })
})

describe("dedupeNews", () => {
  it("removes duplicate stories by id", () => {
    const stories: NewsStory[] = [
      { id: "1", title: "First", url: "", date: "", source: "" },
      { id: "2", title: "Second", url: "", date: "", source: "" },
      { id: "1", title: "Duplicate", url: "", date: "", source: "" },
    ]
    const result = dedupeNews(stories)
    expect(result).toHaveLength(2)
    expect(result.map((s) => s.id)).toEqual(["1", "2"])
  })

  it("returns empty array for empty input", () => {
    expect(dedupeNews([])).toEqual([])
  })
})

describe("dedupeCalendarEvents", () => {
  const baseEvent: CalendarEvent = {
    eventType: "earnings",
    symbol: "AAPL",
    name: "Apple Inc",
    eventDate: "2025-01-15",
    time: "after-hours",
    value: "2.10",
    estimate: "2.05",
  }

  it("removes duplicate events with identical key fields", () => {
    const events = [baseEvent, { ...baseEvent }, { ...baseEvent, symbol: "MSFT" }]
    const result = dedupeCalendarEvents(events)
    expect(result).toHaveLength(2)
  })

  it("keeps events that differ by any key field", () => {
    const events = [
      baseEvent,
      { ...baseEvent, eventDate: "2025-01-16" },
    ]
    const result = dedupeCalendarEvents(events)
    expect(result).toHaveLength(2)
  })

  it("handles null optional fields", () => {
    const event1: CalendarEvent = {
      ...baseEvent,
      time: null,
      value: null,
      estimate: null,
    }
    const event2: CalendarEvent = { ...event1 }
    const result = dedupeCalendarEvents([event1, event2])
    expect(result).toHaveLength(1)
  })
})

describe("getQuoteCacheKey", () => {
  it("returns a normalized cache key", () => {
    expect(getQuoteCacheKey("aapl")).toBe("quote:AAPL")
  })
})

describe("getEodChartCacheKey", () => {
  it("builds the correct key for full variant", () => {
    const key = getEodChartCacheKey("aapl")
    expect(key).toMatch(/^stock:AAPL:eod-chart:full:/)
  })

  it("builds the correct key for compact variant", () => {
    const key = getEodChartCacheKey("msft", "compact")
    expect(key).toMatch(/^stock:MSFT:eod-chart:compact:/)
  })
})

describe("getIntradayChartCacheKey", () => {
  it("includes the interval in the key", () => {
    const key = getIntradayChartCacheKey("tsla", "5min")
    expect(key).toMatch(/^stock:TSLA:intraday-chart:5min:/)
  })
})

describe("getMetricNumberByLabel", () => {
  const metrics: MetricStat[] = [
    { label: "PE", value: 25.3 },
    { label: "PB", value: null },
    { label: "Sector", value: "Technology" },
  ]

  it("returns the numeric value for a matching label", () => {
    expect(getMetricNumberByLabel(metrics, "PE")).toBe(25.3)
  })

  it("returns null when the value is null", () => {
    expect(getMetricNumberByLabel(metrics, "PB")).toBeNull()
  })

  it("returns null when the value is a string", () => {
    expect(getMetricNumberByLabel(metrics, "Sector")).toBeNull()
  })

  it("returns null when the label is not found", () => {
    expect(getMetricNumberByLabel(metrics, "ROE")).toBeNull()
  })
})
