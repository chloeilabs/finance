import "server-only"

import type { SymbolDirectoryEntry } from "@/lib/shared/markets/core"
import type {
  SavedScreenerRecord,
  ScreenerFilterState,
  WatchlistRecord,
} from "@/lib/shared/markets/workspace"

export interface WatchlistRow {
  id: string
  name: string
  symbols: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

export interface SymbolDirectoryRow {
  symbol: string
  name: string
  exchange: string | null
  exchangeShortName: string | null
  type: string | null
  currency: string | null
  sector: string | null
  industry: string | null
  country: string | null
  isActivelyTrading: boolean
  isEtf: boolean
  updatedAt: Date | string
}

export interface CacheRow {
  payload: unknown
  expiresAt: Date | string
}

export interface SavedScreenRow {
  id: string
  name: string
  filters: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

export interface CachedMarketPayloadSnapshot<T> {
  payload: T
  expiresAt: string
}

export function toIsoString(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value)
  return parsed.toISOString()
}

export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = []

  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize))
  }

  return chunks
}

export function normalizeSymbols(symbols: string[]): string[] {
  return [
    ...new Set(symbols.map((item) => item.trim().toUpperCase()).filter(Boolean)),
  ]
}

export function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
}

export function mapWatchlistRow(row: WatchlistRow): WatchlistRecord {
  return {
    id: row.id,
    name: row.name,
    symbols: parseStringArray(row.symbols),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

export function mapSymbolDirectoryRow(
  row: SymbolDirectoryRow
): SymbolDirectoryEntry {
  return {
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    exchangeShortName: row.exchangeShortName,
    type: row.type,
    currency: row.currency,
    sector: row.sector,
    industry: row.industry,
    country: row.country,
    isActivelyTrading: row.isActivelyTrading,
    isEtf: row.isEtf,
    updatedAt: toIsoString(row.updatedAt),
  }
}

export function mapSavedScreenRow(row: SavedScreenRow): SavedScreenerRecord {
  return {
    id: row.id,
    name: row.name,
    filters:
      typeof row.filters === "object" && row.filters !== null
        ? (row.filters as ScreenerFilterState)
        : {},
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}
