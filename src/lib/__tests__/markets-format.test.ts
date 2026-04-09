import { describe, expect, it } from "vitest"

import {
  formatCompactNumber,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatInteger,
  formatLabeledMetricValue,
  formatMetricValue,
  formatNumber,
  formatNumericDate,
  formatPercent,
  formatSignedNumber,
} from "../markets-format"

describe("formatCurrency", () => {
  it("formats a basic USD value", () => {
    expect(formatCurrency(1234.56)).toBe("$1,234.56")
  })

  it("returns N/A for null", () => {
    expect(formatCurrency(null)).toBe("N/A")
  })

  it("returns N/A for undefined", () => {
    expect(formatCurrency(undefined)).toBe("N/A")
  })

  it("returns N/A for NaN", () => {
    expect(formatCurrency(NaN)).toBe("N/A")
  })

  it("formats with compact notation", () => {
    const result = formatCurrency(1_500_000, { compact: true })
    expect(result).toContain("$")
    expect(result).toContain("M")
  })

  it("respects custom currency", () => {
    const result = formatCurrency(100, { currency: "EUR" })
    expect(result).toContain("100")
  })

  it("respects maximumFractionDigits", () => {
    const result = formatCurrency(10.1, { maximumFractionDigits: 0 })
    expect(result).toBe("$10")
  })
})

describe("formatCompactNumber", () => {
  it("formats millions with M suffix", () => {
    expect(formatCompactNumber(1_500_000)).toContain("M")
  })

  it("formats billions with B suffix", () => {
    expect(formatCompactNumber(2_000_000_000)).toContain("B")
  })

  it("returns N/A for null", () => {
    expect(formatCompactNumber(null)).toBe("N/A")
  })

  it("returns N/A for NaN", () => {
    expect(formatCompactNumber(NaN)).toBe("N/A")
  })

  it("formats small numbers without suffix", () => {
    expect(formatCompactNumber(42)).toBe("42")
  })
})

describe("formatInteger", () => {
  it("formats with commas and no decimals", () => {
    expect(formatInteger(1234567)).toBe("1,234,567")
  })

  it("rounds to the nearest integer", () => {
    expect(formatInteger(1234.9)).toBe("1,235")
  })

  it("returns N/A for null", () => {
    expect(formatInteger(null)).toBe("N/A")
  })

  it("returns N/A for NaN", () => {
    expect(formatInteger(NaN)).toBe("N/A")
  })
})

describe("formatPercent", () => {
  it("formats a percent value (default scale is percent)", () => {
    const result = formatPercent(52.5)
    expect(result).toContain("52")
    expect(result).toContain("%")
  })

  it("formats a fractional value when scale is fraction", () => {
    const result = formatPercent(0.525, { scale: "fraction" })
    expect(result).toContain("52")
    expect(result).toContain("%")
  })

  it("returns N/A for null", () => {
    expect(formatPercent(null)).toBe("N/A")
  })

  it("returns N/A for NaN", () => {
    expect(formatPercent(NaN)).toBe("N/A")
  })

  it("respects custom decimals", () => {
    const result = formatPercent(33.3333, { decimals: 1 })
    expect(result).toContain("33.3%")
  })
})

describe("formatSignedNumber", () => {
  it("adds a plus sign for positive values", () => {
    expect(formatSignedNumber(5)).toMatch(/\+5/)
  })

  it("shows a minus sign for negative values", () => {
    const result = formatSignedNumber(-3.5)
    expect(result).toContain("3.5")
    expect(result).toMatch(/-|−/)
  })

  it("formats zero without a sign", () => {
    expect(formatSignedNumber(0)).toBe("0")
  })

  it("returns N/A for null", () => {
    expect(formatSignedNumber(null)).toBe("N/A")
  })
})

describe("formatNumber", () => {
  it("formats a number with default digits", () => {
    expect(formatNumber(1234.5678)).toBe("1,234.57")
  })

  it("respects custom digits option", () => {
    expect(formatNumber(1.23456, { digits: 4 })).toBe("1.2346")
  })

  it("returns N/A for null", () => {
    expect(formatNumber(null)).toBe("N/A")
  })

  it("returns N/A for NaN", () => {
    expect(formatNumber(NaN)).toBe("N/A")
  })
})

describe("formatDate", () => {
  it("formats an ISO date string", () => {
    const result = formatDate("2025-03-15T12:00:00")
    expect(result).toContain("Mar")
    expect(result).toContain("15")
    expect(result).toContain("2025")
  })

  it("returns N/A for null", () => {
    expect(formatDate(null)).toBe("N/A")
  })

  it("returns N/A for undefined", () => {
    expect(formatDate(undefined)).toBe("N/A")
  })

  it("returns the original string for an unparseable date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date")
  })
})

describe("formatNumericDate", () => {
  it("formats a YYYY-MM-DD date string to MM/DD/YYYY", () => {
    expect(formatNumericDate("2025-03-15")).toBe("03/15/2025")
  })

  it("returns N/A for null", () => {
    expect(formatNumericDate(null)).toBe("N/A")
  })

  it("returns N/A for undefined", () => {
    expect(formatNumericDate(undefined)).toBe("N/A")
  })

  it("returns the original string for an unparseable date", () => {
    expect(formatNumericDate("bad")).toBe("bad")
  })
})

describe("formatDateTime", () => {
  it("formats a datetime string with month, day, and time", () => {
    const result = formatDateTime("2025-03-15T14:30:00")
    expect(result).toContain("Mar")
    expect(result).toContain("15")
  })

  it("returns N/A for null", () => {
    expect(formatDateTime(null)).toBe("N/A")
  })

  it("returns the original string for an unparseable date", () => {
    expect(formatDateTime("xyz")).toBe("xyz")
  })
})

describe("formatMetricValue", () => {
  it("returns N/A for null", () => {
    expect(formatMetricValue(null)).toBe("N/A")
  })

  it("returns N/A for undefined", () => {
    expect(formatMetricValue(undefined)).toBe("N/A")
  })

  it("returns strings as-is", () => {
    expect(formatMetricValue("Technology")).toBe("Technology")
  })

  it("uses compact formatting for large numbers", () => {
    const result = formatMetricValue(5_000_000)
    expect(result).toContain("M")
  })

  it("formats small fractional numbers with 2 decimals", () => {
    expect(formatMetricValue(0.75)).toBe("0.75")
  })

  it("formats moderate numbers normally", () => {
    expect(formatMetricValue(42)).toBe("42")
  })

  it("returns N/A for NaN", () => {
    expect(formatMetricValue(NaN)).toBe("N/A")
  })
})

describe("formatLabeledMetricValue", () => {
  it("formats fractional percent metrics as percentages", () => {
    const result = formatLabeledMetricValue("ROE", 0.15)
    expect(result).toContain("15")
    expect(result).toContain("%")
  })

  it("formats Margin labels as percentages", () => {
    const result = formatLabeledMetricValue("Gross Margin", 0.45)
    expect(result).toContain("45")
    expect(result).toContain("%")
  })

  it("formats Growth labels as percentages", () => {
    const result = formatLabeledMetricValue("Revenue Growth", 0.12)
    expect(result).toContain("12")
    expect(result).toContain("%")
  })

  it("falls back to formatMetricValue for non-percent labels", () => {
    expect(formatLabeledMetricValue("Market Cap", 1_000_000)).toContain("M")
  })

  it("returns N/A for null values", () => {
    expect(formatLabeledMetricValue("ROE", null)).toBe("N/A")
  })

  it("returns string values as-is", () => {
    expect(formatLabeledMetricValue("Sector", "Tech")).toBe("Tech")
  })
})
