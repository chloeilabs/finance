import type {
  EtfExposureEntry,
  InsiderTradeEntry,
  OwnershipEntry,
  ValuationSnapshot,
} from "@/lib/shared/markets/intelligence"

import { fetchFmpJson } from "../fmp-request"
import { asArray, asRecord, pickNumber, pickString } from "./support"

function mapOwnership(item: unknown): OwnershipEntry | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    holder: pickString(record, ["holder", "name"]),
    dateReported: pickString(record, ["dateReported", "date"]),
    shares: pickNumber(record, ["shares", "sharesNumber"]),
    weightPercentage: pickNumber(record, ["weightPercentage", "weight"]),
  }
}

function mapInsiderTrade(item: unknown): InsiderTradeEntry | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    reportingName: pickString(record, ["reportingName", "reportingOwnerName"]),
    transactionType: pickString(record, [
      "transactionType",
      "acquisitionOrDisposition",
    ]),
    securitiesOwned: pickNumber(record, [
      "securitiesOwned",
      "securitiesTransacted",
    ]),
    price: pickNumber(record, ["price"]),
    filingDate: pickString(record, ["filingDate", "transactionDate"]),
  }
}

function mapEtfExposure(item: unknown): EtfExposureEntry | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    symbol: pickString(record, ["asset", "symbol"]),
    etfName: pickString(record, ["name", "etfName"]),
    sharesNumber: pickNumber(record, ["sharesNumber"]),
    weightPercentage: pickNumber(record, ["weightPercentage", "weight"]),
  }
}

function mapValuation(
  item: unknown,
  ownerEarnings: unknown
): ValuationSnapshot | null {
  const record = asRecord(item)
  const ownerRecord = asRecord(ownerEarnings)

  if (!record && !ownerRecord) {
    return null
  }

  return {
    dcf: record ? pickNumber(record, ["dcf", "equityValuePerShare"]) : null,
    marketCap: record ? pickNumber(record, ["marketCap"]) : null,
    enterpriseValue: record ? pickNumber(record, ["enterpriseValue"]) : null,
    ownerEarnings: ownerRecord
      ? pickNumber(ownerRecord, ["ownerEarnings"])
      : null,
  }
}

export function createReferenceDataClient() {
  return {
    ownership: {
      async getInstitutionalOwnership(
        symbol: string
      ): Promise<OwnershipEntry[]> {
        const currentYear = new Date().getUTCFullYear()
        const currentQuarter = Math.max(
          1,
          Math.min(4, Math.ceil((new Date().getUTCMonth() + 1) / 3))
        )
        const payload = await fetchFmpJson(
          "/stable/institutional-ownership/extract-analytics/holder",
          {
            symbol,
            year: currentYear,
            quarter: currentQuarter,
            page: 0,
            limit: 10,
          }
        ).catch(() => [])

        return asArray(payload)
          .map(mapOwnership)
          .filter((item): item is OwnershipEntry => item !== null)
      },
    },
    insider: {
      async getInsiderTrades(symbol: string): Promise<InsiderTradeEntry[]> {
        const payload = await fetchFmpJson("/stable/insider-trading", {
          symbol,
          page: 0,
          limit: 10,
        }).catch(() => [])

        return asArray(payload)
          .map(mapInsiderTrade)
          .filter((item): item is InsiderTradeEntry => item !== null)
      },
    },
    etf: {
      async getAssetExposure(symbol: string): Promise<EtfExposureEntry[]> {
        const payload = await fetchFmpJson("/stable/etf/asset-exposure", {
          symbol,
        })

        return asArray(payload)
          .map(mapEtfExposure)
          .filter((item): item is EtfExposureEntry => item !== null)
          .slice(0, 10)
      },
    },
    valuation: {
      async getSnapshot(symbol: string): Promise<ValuationSnapshot | null> {
        const ownerEarningsPromise = fetchFmpJson("/stable/owner-earnings", {
          symbol,
        }).catch(() => [])

        const [dcfSnapshot, ownerEarnings] = await Promise.all([
          fetchFmpJson("/stable/levered-discounted-cash-flow", {
            symbol,
          }).catch(() => []),
          ownerEarningsPromise,
        ])

        let valuation = asArray(dcfSnapshot)[0] ?? null

        if (!valuation) {
          const enterpriseValue = await fetchFmpJson(
            "/stable/enterprise-values",
            { symbol }
          ).catch(() => [])

          valuation = asArray(enterpriseValue)[0] ?? null
        }

        return mapValuation(valuation, asArray(ownerEarnings)[0])
      },
    },
  }
}
