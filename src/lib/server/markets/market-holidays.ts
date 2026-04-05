import "server-only"

import type { MarketHoliday } from "@/lib/shared/markets/intelligence"

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function nthWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number,
  occurrence: number
): Date {
  const firstDay = new Date(Date.UTC(year, monthIndex, 1))
  const offset = (weekday - firstDay.getUTCDay() + 7) % 7
  return new Date(Date.UTC(year, monthIndex, 1 + offset + (occurrence - 1) * 7))
}

function lastWeekdayOfMonth(
  year: number,
  monthIndex: number,
  weekday: number
): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0))
  const offset = (lastDay.getUTCDay() - weekday + 7) % 7
  return new Date(
    Date.UTC(year, monthIndex, lastDay.getUTCDate() - offset)
  )
}

function observedFixedHoliday(
  year: number,
  monthIndex: number,
  day: number
): Date {
  const actual = new Date(Date.UTC(year, monthIndex, day))

  switch (actual.getUTCDay()) {
    case 0:
      return addUtcDays(actual, 1)
    case 6:
      return addUtcDays(actual, -1)
    default:
      return actual
  }
}

function getEasterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const month = Math.floor((h + l - 7 * m + 114) / 31)
  const day = ((h + l - 7 * m + 114) % 31) + 1

  return new Date(Date.UTC(year, month - 1, day))
}

function createMarketHoliday(
  exchange: string,
  date: Date,
  name: string
): MarketHoliday {
  return {
    exchange,
    date: formatIsoDate(date),
    name,
    isClosed: true,
    adjOpenTime: null,
    adjCloseTime: null,
  }
}

function compareHolidayDates(left: MarketHoliday, right: MarketHoliday): number {
  return (left.date ?? "").localeCompare(right.date ?? "")
}

function getUsMarketHolidaysForYear(
  exchange: string,
  year: number
): MarketHoliday[] {
  return [
    createMarketHoliday(
      exchange,
      observedFixedHoliday(year, 0, 1),
      "New Year's Day"
    ),
    createMarketHoliday(
      exchange,
      nthWeekdayOfMonth(year, 0, 1, 3),
      "Martin Luther King, Jr. Day"
    ),
    createMarketHoliday(
      exchange,
      nthWeekdayOfMonth(year, 1, 1, 3),
      "Washington's Birthday"
    ),
    createMarketHoliday(
      exchange,
      addUtcDays(getEasterSunday(year), -2),
      "Good Friday"
    ),
    createMarketHoliday(
      exchange,
      lastWeekdayOfMonth(year, 4, 1),
      "Memorial Day"
    ),
    createMarketHoliday(
      exchange,
      observedFixedHoliday(year, 5, 19),
      "Juneteenth National Independence Day"
    ),
    createMarketHoliday(
      exchange,
      observedFixedHoliday(year, 6, 4),
      "Independence Day"
    ),
    createMarketHoliday(
      exchange,
      nthWeekdayOfMonth(year, 8, 1, 1),
      "Labor Day"
    ),
    createMarketHoliday(
      exchange,
      nthWeekdayOfMonth(year, 10, 4, 4),
      "Thanksgiving Day"
    ),
    createMarketHoliday(
      exchange,
      observedFixedHoliday(year, 11, 25),
      "Christmas Day"
    ),
  ]
}

export function selectUpcomingMarketHolidays(params: {
  exchange: string
  items: MarketHoliday[]
  today: string
  limit?: number
}): MarketHoliday[] {
  const limit = params.limit ?? 2

  const liveUpcoming = params.items
    .filter((item) => item.date && item.date >= params.today)
    .sort(compareHolidayDates)

  if (liveUpcoming.length > 0) {
    return liveUpcoming.slice(0, limit)
  }

  // FMP's holidays-by-exchange feed is historical-only in practice, so
  // project the standard US market schedule when no future rows are present.
  const year = Number.parseInt(params.today.slice(0, 4), 10)

  if (!Number.isInteger(year)) {
    return []
  }

  return [year, year + 1]
    .flatMap((holidayYear) =>
      getUsMarketHolidaysForYear(params.exchange, holidayYear)
    )
    .filter((item) => item.date && item.date >= params.today)
    .sort(compareHolidayDates)
    .slice(0, limit)
}
