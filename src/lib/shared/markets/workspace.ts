import type { PeerComparisonRow, ResearchQuoteRow } from "./intelligence"
import type { MarketPlanSummary } from "./plan"

export const MARKET_SCREENER_SORT_KEYS = [
  "symbol",
  "marketCap",
  "price",
  "volume",
  "beta",
  "dividend",
  "dcf",
  "piotroskiScore",
  "freeFloatPercentage",
] as const

export type MarketScreenerSortKey = (typeof MARKET_SCREENER_SORT_KEYS)[number]

export type SortDirection = "asc" | "desc"

export interface ScreenerOptions {
  exchanges: string[]
  sectors: string[]
  industries: string[]
}

export interface WatchlistRecord {
  id: string
  name: string
  symbols: string[]
  createdAt: string
  updatedAt: string
}

export interface ScreenerFilterState {
  marketCapMin?: number
  marketCapMax?: number
  betaMin?: number
  betaMax?: number
  volumeMin?: number
  volumeMax?: number
  dividendMin?: number
  dividendMax?: number
  priceMin?: number
  priceMax?: number
  isEtf?: boolean
  isActivelyTrading?: boolean
  sector?: string
  industry?: string
  exchange?: string
  sortBy?: MarketScreenerSortKey
  sortDirection?: SortDirection
}

export interface SavedScreenerRecord {
  id: string
  name: string
  filters: ScreenerFilterState
  createdAt: string
  updatedAt: string
}

export interface ComparePageData {
  symbols: string[]
  entries: PeerComparisonRow[]
  generatedAt: string
}

export interface WatchlistResearchData {
  status: "ok" | "storage_unavailable"
  watchlist: WatchlistRecord | null
  rows: ResearchQuoteRow[]
  plan: MarketPlanSummary
}
