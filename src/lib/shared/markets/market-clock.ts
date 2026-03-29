export const MARKET_TIME_ZONE = "America/New_York"

const MARKET_DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: MARKET_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})

interface MarketDateParts {
  year: number
  month: number
  day: number
}

function getMarketDateParts(now: Date): MarketDateParts {
  const parts = MARKET_DATE_FORMATTER.formatToParts(now)

  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)

  return { year, month, day }
}

function formatIsoDate(parts: MarketDateParts): string {
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-")
}

function shiftIsoDate(isoDate: string, days: number): string {
  const parts = isoDate.split("-").map((value) => Number(value))

  if (parts.length !== 3) {
    return isoDate
  }

  const [year, month, day] = parts

  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return isoDate
  }

  return new Date(Date.UTC(year, month - 1, day + days))
    .toISOString()
    .slice(0, 10)
}

export interface MarketDateClock {
  today: string
  plusDays: (days: number) => string
  minusDays: (days: number) => string
}

export function createMarketDateClock(now: Date = new Date()): MarketDateClock {
  const today = formatIsoDate(getMarketDateParts(now))

  return {
    today,
    plusDays(days: number) {
      return shiftIsoDate(today, days)
    },
    minusDays(days: number) {
      return shiftIsoDate(today, -days)
    },
  }
}

export function getMarketTodayIsoDate(now: Date = new Date()): string {
  return createMarketDateClock(now).today
}
