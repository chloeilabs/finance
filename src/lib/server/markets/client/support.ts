import "server-only"

import type { CalendarEvent } from "@/lib/shared/markets/core"

export function mapCalendarEvent(
  item: unknown,
  eventType: CalendarEvent["eventType"]
): CalendarEvent | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const eventDate = pickString(record, ["date", "fillingDate"])
  const symbol = pickString(record, ["symbol"])

  if (!eventDate) {
    return null
  }

  return {
    symbol: symbol ?? pickString(record, ["country", "currency"]) ?? "N/A",
    name:
      pickString(record, ["name", "companyName", "event"]) ??
      symbol ??
      "Unknown",
    eventType,
    eventDate,
    time: pickString(record, ["time"]),
    value:
      pickString(record, [
        "dividend",
        "adjDividend",
        "splitRatio",
        "actual",
        "previous",
      ]) ??
      pickNumber(record, [
        "dividend",
        "adjDividend",
        "actual",
        "previous",
      ])?.toString() ??
      null,
    estimate:
      pickString(record, ["epsEstimated", "eps", "estimate"]) ??
      pickNumber(record, ["epsEstimated", "eps", "estimate"])?.toString() ??
      null,
    yield: pickNumber(record, ["yield"]),
    recordDate: pickString(record, ["recordDate"]),
    paymentDate: pickString(record, ["paymentDate"]),
    declarationDate: pickString(record, ["declarationDate"]),
    frequency: pickString(record, ["frequency"]),
  }
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

export function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

export function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

export function asBoolean(value: unknown): boolean {
  if (value === true || value === "true") {
    return true
  }

  return false
}

export function pickString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = asString(record[key])
    if (value) {
      return value
    }
  }

  return null
}

export function pickNumber(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = asNumber(record[key])
    if (value !== null) {
      return value
    }
  }

  return null
}

export function dedupeSymbols(symbols: string[]): string[] {
  return [
    ...new Set(
      symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)
    ),
  ]
}
