import type { CompanyProfile } from "@/lib/shared/markets/core"
import type {
  EmployeeCountPoint,
  MarketCapPoint,
  RevenueSegmentation,
  SecProfile,
} from "@/lib/shared/markets/intelligence"

import { fetchFmpJson } from "../fmp-request"
import { asArray, asNumber, asRecord, pickNumber, pickString } from "./support"

function mapProfile(item: unknown): CompanyProfile | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const symbol = pickString(record, ["symbol"])
  const companyName = pickString(record, ["companyName", "name"])

  if (!symbol || !companyName) {
    return null
  }

  return {
    symbol,
    companyName,
    exchangeShortName: pickString(record, ["exchangeShortName", "exchange"]),
    sector: pickString(record, ["sector"]),
    industry: pickString(record, ["industry"]),
    website: pickString(record, ["website"]),
    description: pickString(record, ["description"]),
    ceo: pickString(record, ["ceo"]),
    country: pickString(record, ["country"]),
    city: pickString(record, ["city"]),
    state: pickString(record, ["state"]),
    employees: pickNumber(record, ["fullTimeEmployees", "employees"]),
    ipoDate: pickString(record, ["ipoDate"]),
    beta: pickNumber(record, ["beta"]),
    marketCap: pickNumber(record, ["mktCap", "marketCap"]),
    image: pickString(record, ["image"]),
  }
}

function mapRevenueSegmentation(item: unknown): RevenueSegmentation | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const segmentsRecord = asRecord(record.data)

  if (!segmentsRecord) {
    return null
  }

  return {
    date: pickString(record, ["date"]),
    fiscalYear: pickNumber(record, ["fiscalYear"]),
    period: pickString(record, ["period"]),
    segments: Object.entries(segmentsRecord)
      .map(([label, value]) => ({
        label,
        value: asNumber(value),
      }))
      .sort((left, right) => (right.value ?? 0) - (left.value ?? 0)),
  }
}

function mapMarketCapPoint(item: unknown): MarketCapPoint | null {
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
    marketCap: pickNumber(record, ["marketCap"]),
  }
}

function mapEmployeeCountPoint(item: unknown): EmployeeCountPoint | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    acceptanceTime: pickString(record, ["acceptanceTime"]),
    periodOfReport: pickString(record, ["periodOfReport", "date"]),
    employeeCount: pickNumber(record, ["employeeCount", "employees"]),
  }
}

function mapSecProfile(item: unknown): SecProfile | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    cik: pickString(record, ["cik"]),
    registrantName: pickString(record, ["registrantName"]),
    sicCode: pickString(record, ["sicCode"]),
    sicDescription: pickString(record, ["sicDescription"]),
    sicGroup: pickString(record, ["sicGroup"]),
  }
}

export function createCompanyClient() {
  return {
    async getProfile(symbol: string): Promise<CompanyProfile | null> {
      const payload = await fetchFmpJson("/stable/profile", { symbol })
      return mapProfile(asArray(payload)[0])
    },
    async getPeers(symbol: string): Promise<string[]> {
      const payload = await fetchFmpJson("/stable/stock-peers", { symbol })
      return asArray(payload)
        .flatMap((item) => {
          const record = asRecord(item)
          return record ? asArray(record.peersList) : []
        })
        .map((item) => (typeof item === "string" ? item.trim() : null))
        .filter((item): item is string => Boolean(item))
    },
    async getMarketCapHistory(symbol: string): Promise<MarketCapPoint[]> {
      const payload = await fetchFmpJson(
        "/stable/historical-market-capitalization",
        {
          symbol,
          limit: 120,
        }
      )

      return asArray(payload)
        .map(mapMarketCapPoint)
        .filter((item): item is MarketCapPoint => item !== null)
        .reverse()
    },
    async getEmployeeHistory(symbol: string): Promise<EmployeeCountPoint[]> {
      const payload = await fetchFmpJson("/stable/historical-employee-count", {
        symbol,
      })

      return asArray(payload)
        .map(mapEmployeeCountPoint)
        .filter((item): item is EmployeeCountPoint => item !== null)
        .reverse()
    },
    async getLatestEmployeeCount(
      symbol: string
    ): Promise<EmployeeCountPoint | null> {
      const payload = await fetchFmpJson("/stable/employee-count", {
        symbol,
      })

      return mapEmployeeCountPoint(asArray(payload)[0])
    },
    async getProductSegmentation(
      symbol: string
    ): Promise<RevenueSegmentation | null> {
      const payload = await fetchFmpJson("/stable/revenue-product-segmentation", {
        symbol,
      })

      return mapRevenueSegmentation(asArray(payload)[0])
    },
    async getGeographicSegmentation(
      symbol: string
    ): Promise<RevenueSegmentation | null> {
      const payload = await fetchFmpJson(
        "/stable/revenue-geographic-segmentation",
        {
          symbol,
        }
      )

      return mapRevenueSegmentation(asArray(payload)[0])
    },
    async getSecProfile(symbol: string): Promise<SecProfile | null> {
      const payload = await fetchFmpJson("/stable/sec-profile", { symbol })
      return mapSecProfile(asArray(payload)[0])
    },
  }
}
