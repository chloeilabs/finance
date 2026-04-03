import type {
  EtfAllocationEntry,
  EtfExposureEntry,
  EtfHoldingEntry,
  EtfInfoSnapshot,
  InsiderTradeEntry,
  LatestInsiderTradeEntry,
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

function mapEtfHolding(item: unknown): EtfHoldingEntry | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    symbol: pickString(record, ["asset", "symbol", "holdingSymbol"]),
    name: pickString(record, ["name", "assetName", "holdingName"]),
    marketValue: pickNumber(record, ["marketValue", "value"]),
    sharesNumber: pickNumber(record, ["sharesNumber", "shares"]),
    weightPercentage: pickNumber(record, ["weightPercentage", "weight"]),
  }
}

function mapEtfAllocation(
  item: unknown,
  labelKeys: string[]
): EtfAllocationEntry | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const label = pickString(record, labelKeys)

  if (!label) {
    return null
  }

  return {
    label,
    weightPercentage: pickNumber(record, [
      "weightPercentage",
      "weight",
      "allocation",
      "percentage",
    ]),
  }
}

function mapEtfInfo(item: unknown): EtfInfoSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const symbol = pickString(record, ["symbol", "ticker"])

  if (!symbol) {
    return null
  }

  return {
    symbol,
    name: pickString(record, ["name", "fundName", "etfName"]),
    exchange: pickString(record, ["exchange", "exchangeShortName"]),
    currency: pickString(record, ["currency"]),
    website: pickString(record, [
      "website",
      "fundWebsite",
      "fundHomePage",
      "homePage",
    ]),
    description: pickString(record, [
      "description",
      "summary",
      "fundDescription",
    ]),
    provider: pickString(record, ["provider", "issuer", "fundFamily"]),
    assetClass: pickString(record, ["assetClass"]),
    category: pickString(record, ["category", "fundCategory"]),
    region: pickString(record, ["region", "geography"]),
    domicile: pickString(record, ["domicile", "country"]),
    indexTracked: pickString(record, [
      "indexTracked",
      "index",
      "benchmark",
      "benchmarkIndex",
    ]),
    expenseRatio: pickNumber(record, ["expenseRatio", "expense"]),
    assets: pickNumber(record, ["totalAssets", "assets", "aum"]),
    nav: pickNumber(record, ["nav", "netAssetValue"]),
    peRatio: pickNumber(record, ["peRatio", "pe"]),
    beta: pickNumber(record, ["beta"]),
    totalHoldings: pickNumber(record, [
      "holdings",
      "holdingsCount",
      "numberOfHoldings",
      "totalHoldings",
    ]),
    sharesOutstanding: pickNumber(record, [
      "sharesOutstanding",
      "sharesOut",
      "shares",
    ]),
    inceptionDate: pickString(record, ["inceptionDate", "inception"]),
    dividendYield: pickNumber(record, ["dividendYield", "yield"]),
    dividendPerShare: pickNumber(record, [
      "dividendPerShare",
      "dividend",
      "annualDividend",
    ]),
    exDividendDate: pickString(record, ["exDividendDate"]),
    frequency: pickString(record, [
      "frequency",
      "distributionFrequency",
      "payoutFrequency",
    ]),
  }
}

function mapLatestInsiderTrade(item: unknown): LatestInsiderTradeEntry | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const symbol = pickString(record, ["symbol"])

  if (!symbol) {
    return null
  }

  return {
    symbol,
    reportingName: pickString(record, [
      "reportingName",
      "reportingOwnerName",
      "reportingOwner",
    ]),
    transactionType: pickString(record, [
      "transactionType",
      "acquisitionOrDisposition",
    ]),
    securitiesTransacted: pickNumber(record, [
      "securitiesTransacted",
      "securitiesOwned",
    ]),
    price: pickNumber(record, ["price"]),
    filingDate: pickString(record, ["filingDate"]),
    transactionDate: pickString(record, ["transactionDate"]),
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
      async getLatestInsiderTrades(
        limit = 10
      ): Promise<LatestInsiderTradeEntry[]> {
        const payload = await fetchFmpJson("/stable/insider-trading/latest", {
          page: 0,
          limit,
        })

        return asArray(payload)
          .map(mapLatestInsiderTrade)
          .filter((item): item is LatestInsiderTradeEntry => item !== null)
      },
    },
    etf: {
      async getInfo(symbol: string): Promise<EtfInfoSnapshot | null> {
        const payload = await fetchFmpJson("/stable/etf/info", {
          symbol,
        }).catch(() => [])

        return mapEtfInfo(asArray(payload)[0])
      },
      async getHoldings(symbol: string): Promise<EtfHoldingEntry[]> {
        const payload = await fetchFmpJson("/stable/etf/holdings", {
          symbol,
        }).catch(() => [])

        return asArray(payload)
          .map(mapEtfHolding)
          .filter((item): item is EtfHoldingEntry => item !== null)
      },
      async getSectorWeightings(symbol: string): Promise<EtfAllocationEntry[]> {
        const payload = await fetchFmpJson("/stable/etf/sector-weightings", {
          symbol,
        }).catch(() => [])

        return asArray(payload)
          .map((item) => mapEtfAllocation(item, ["sector", "name"]))
          .filter((item): item is EtfAllocationEntry => item !== null)
      },
      async getCountryWeightings(
        symbol: string
      ): Promise<EtfAllocationEntry[]> {
        const payload = await fetchFmpJson("/stable/etf/country-weightings", {
          symbol,
        }).catch(() => [])

        return asArray(payload)
          .map((item) => mapEtfAllocation(item, ["country", "name"]))
          .filter((item): item is EtfAllocationEntry => item !== null)
      },
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
