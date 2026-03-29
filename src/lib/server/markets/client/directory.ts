import type {
  MarketSearchResult,
  SymbolDirectoryEntry,
} from "@/lib/shared/markets/core"

import { fetchFmpJson } from "../fmp-request"
import {
  asArray,
  asBoolean,
  asRecord,
  asString,
  pickNumber,
  pickString,
} from "./support"

interface SymbolDirectoryFlags {
  isActivelyTrading?: boolean
  isEtf?: boolean
}

function mapSearchResult(item: unknown): MarketSearchResult | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const symbol = pickString(record, ["symbol", "ticker"])
  const name = pickString(record, ["name", "companyName"])

  if (!symbol || !name) {
    return null
  }

  return {
    symbol,
    name,
    exchange: pickString(record, ["exchange"]),
    exchangeShortName: pickString(record, ["exchangeShortName"]),
    type: pickString(record, ["type"]),
    currency: pickString(record, ["currency"]),
    sector: pickString(record, ["sector"]),
    industry: pickString(record, ["industry"]),
    price: pickNumber(record, ["price"]),
    marketCap: pickNumber(record, ["marketCap", "mktCap"]),
    volume: pickNumber(record, ["volume"]),
    beta: pickNumber(record, ["beta"]),
    dividend: pickNumber(record, ["lastAnnualDividend", "dividend"]),
  }
}

function mapSymbolDirectoryEntry(
  item: unknown,
  flags: SymbolDirectoryFlags = {}
): SymbolDirectoryEntry | null {
  const result = mapSearchResult(item)
  const record = asRecord(item)

  if (!result) {
    return null
  }

  return {
    ...result,
    country: record ? pickString(record, ["country"]) : null,
    isActivelyTrading:
      flags.isActivelyTrading ?? asBoolean(record?.isActivelyTrading),
    isEtf: flags.isEtf ?? /etf/i.test(result.type ?? ""),
    updatedAt: new Date().toISOString(),
  }
}

function mapStringListEntry(item: unknown, field: string): string | null {
  const record = asRecord(item)
  return record ? pickString(record, [field]) : asString(item)
}

export function createDirectoryClient() {
  return {
    async searchSymbols(query: string): Promise<MarketSearchResult[]> {
      const [symbolMatches, nameMatches] = await Promise.all([
        fetchFmpJson("/stable/search-symbol", { query }),
        fetchFmpJson("/stable/search-name", { query }),
      ])

      const merged = [...asArray(symbolMatches), ...asArray(nameMatches)]
        .map(mapSearchResult)
        .filter((item): item is MarketSearchResult => item !== null)

      const seen = new Set<string>()
      return merged.filter((item) => {
        const key = `${item.symbol}:${item.exchangeShortName ?? ""}`
        if (seen.has(key)) {
          return false
        }
        seen.add(key)
        return true
      })
    },
    async listActivelyTrading(): Promise<SymbolDirectoryEntry[]> {
      const payload = await fetchFmpJson("/stable/actively-trading-list")

      return asArray(payload)
        .map((item) => mapSymbolDirectoryEntry(item, { isActivelyTrading: true }))
        .filter((item): item is SymbolDirectoryEntry => item !== null)
    },
    async listEtfs(): Promise<SymbolDirectoryEntry[]> {
      const payload = await fetchFmpJson("/stable/etf-list")

      return asArray(payload)
        .map((item) => mapSymbolDirectoryEntry(item, { isEtf: true }))
        .filter((item): item is SymbolDirectoryEntry => item !== null)
    },
    async listExchanges(): Promise<string[]> {
      const payload = await fetchFmpJson("/stable/available-exchanges")

      return asArray(payload)
        .map((item) => {
          const record = asRecord(item)
          return record ? pickString(record, ["exchange", "name"]) : asString(item)
        })
        .filter((item): item is string => Boolean(item))
    },
    async listSectors(): Promise<string[]> {
      const payload = await fetchFmpJson("/stable/available-sectors")

      return asArray(payload)
        .map((item) => mapStringListEntry(item, "sector"))
        .filter((item): item is string => Boolean(item))
    },
    async listIndustries(): Promise<string[]> {
      const payload = await fetchFmpJson("/stable/available-industries")

      return asArray(payload)
        .map((item) => mapStringListEntry(item, "industry"))
        .filter((item): item is string => Boolean(item))
    },
    async screenCompanies(
      params: Record<string, string | number | boolean | undefined>
    ): Promise<MarketSearchResult[]> {
      const payload = await fetchFmpJson("/stable/company-screener", params)

      return asArray(payload)
        .map(mapSearchResult)
        .filter((item): item is MarketSearchResult => item !== null)
    },
  }
}
