import type { CalendarEvent, MacroRate } from "@/lib/shared/markets/core"
import type {
  MarketHoliday,
  MarketHoursSnapshot,
  RiskPremiumSnapshot,
  SectorHistoryPoint,
  SectorValuationSnapshot,
} from "@/lib/shared/markets/intelligence"

import { fetchFmpJson } from "../fmp-request"
import { asArray, asBoolean, asRecord, pickNumber, pickString } from "./support"

function mapCalendarEvent(
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

function mapMacroRate(item: unknown): MacroRate | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const label = pickString(record, ["name", "maturity", "event"])

  if (!label) {
    return null
  }

  return {
    label,
    value: pickNumber(record, ["value", "rate", "actual"]),
    previous: pickNumber(record, ["previous"]),
    date: pickString(record, ["date"]),
  }
}

function mapMarketHours(item: unknown): MarketHoursSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const exchange = pickString(record, ["exchange"])

  if (!exchange) {
    return null
  }

  return {
    exchange,
    name: pickString(record, ["name"]),
    openingHour: pickString(record, ["openingHour"]),
    closingHour: pickString(record, ["closingHour"]),
    timezone: pickString(record, ["timezone"]),
    isMarketOpen: asBoolean(record.isMarketOpen),
  }
}

function mapMarketHoliday(item: unknown): MarketHoliday | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const exchange = pickString(record, ["exchange"])

  if (!exchange) {
    return null
  }

  return {
    exchange,
    date: pickString(record, ["date"]),
    name: pickString(record, ["name"]),
    isClosed: asBoolean(record.isClosed),
    adjOpenTime: pickString(record, ["adjOpenTime"]),
    adjCloseTime: pickString(record, ["adjCloseTime"]),
  }
}

function mapSectorValuation(item: unknown): SectorValuationSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const sector = pickString(record, ["sector"])

  if (!sector) {
    return null
  }

  return {
    date: pickString(record, ["date"]),
    sector,
    exchange: pickString(record, ["exchange"]),
    pe: pickNumber(record, ["pe"]),
  }
}

function mapSectorHistoryPoint(item: unknown): SectorHistoryPoint | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const date = pickString(record, ["date"])

  if (!date) {
    return null
  }

  return {
    date,
    averageChange: pickNumber(record, ["averageChange"]),
  }
}

function mapRiskPremium(item: unknown): RiskPremiumSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const country = pickString(record, ["country"])

  if (!country) {
    return null
  }

  return {
    country,
    countryRiskPremium: pickNumber(record, ["countryRiskPremium"]),
    totalEquityRiskPremium: pickNumber(record, ["totalEquityRiskPremium"]),
  }
}

export function createMarketStructureClient() {
  return {
    macro: {
      async getTreasuryRates(): Promise<MacroRate[]> {
        const payload = await fetchFmpJson("/stable/treasury-rates")
        const latest = asRecord(asArray(payload)[0])

        if (!latest) {
          return []
        }

        const labels = [
          ["month3", "3M Treasury"],
          ["year2", "2Y Treasury"],
          ["year10", "10Y Treasury"],
        ] as const

        return labels.map(([key, label]) => ({
          label,
          value: pickNumber(latest, [key]),
          previous: null,
          date: pickString(latest, ["date"]),
        }))
      },
      async getEconomicCalendar(
        from?: string,
        to?: string
      ): Promise<CalendarEvent[]> {
        const payload = await fetchFmpJson("/stable/economic-calendar", {
          from,
          to,
        })

        return asArray(payload)
          .map((item) => mapCalendarEvent(item, "economic"))
          .filter((item): item is CalendarEvent => item !== null)
      },
      async getEconomicIndicators(names: string[]): Promise<MacroRate[]> {
        const entries = await Promise.all(
          names.map((name) =>
            fetchFmpJson("/stable/economic-indicators", { name }).catch(
              () => []
            )
          )
        )

        return entries
          .flatMap((payload) => asArray(payload).slice(0, 1))
          .map(mapMacroRate)
          .filter((item): item is MacroRate => item !== null)
      },
      async getMarketRiskPremium(): Promise<RiskPremiumSnapshot | null> {
        const payload = await fetchFmpJson("/stable/market-risk-premium")

        return (
          asArray(payload)
            .map(mapRiskPremium)
            .find((item) => item?.country === "United States") ?? null
        )
      },
    },
    marketStructure: {
      async getExchangeMarketHours(
        exchange: string
      ): Promise<MarketHoursSnapshot | null> {
        const payload = await fetchFmpJson("/stable/exchange-market-hours", {
          exchange,
        })

        return mapMarketHours(asArray(payload)[0])
      },
      async getAllExchangeMarketHours(): Promise<MarketHoursSnapshot[]> {
        const payload = await fetchFmpJson("/stable/all-exchange-market-hours")

        return asArray(payload)
          .map(mapMarketHours)
          .filter((item): item is MarketHoursSnapshot => item !== null)
      },
      async getHolidaysByExchange(exchange: string): Promise<MarketHoliday[]> {
        const payload = await fetchFmpJson("/stable/holidays-by-exchange", {
          exchange,
        })

        return asArray(payload)
          .map(mapMarketHoliday)
          .filter((item): item is MarketHoliday => item !== null)
      },
    },
    breadth: {
      async getSectorPeSnapshot(
        date?: string
      ): Promise<SectorValuationSnapshot[]> {
        const payload = await fetchFmpJson("/stable/sector-pe-snapshot", {
          date,
        })

        return asArray(payload)
          .map(mapSectorValuation)
          .filter((item): item is SectorValuationSnapshot => item !== null)
      },
      async getHistoricalSectorPerformance(
        sector: string
      ): Promise<SectorHistoryPoint[]> {
        const payload = await fetchFmpJson(
          "/stable/historical-sector-performance",
          {
            sector,
          }
        )

        return asArray(payload)
          .map(mapSectorHistoryPoint)
          .filter((item): item is SectorHistoryPoint => item !== null)
          .slice(0, 20)
          .reverse()
      },
    },
  }
}
