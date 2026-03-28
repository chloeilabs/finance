export const FMP_PLAN_TIERS = [
  "BASIC",
  "STARTER",
  "PREMIUM",
  "ULTIMATE",
] as const

export type FmpPlanTier = (typeof FMP_PLAN_TIERS)[number]

export const FMP_CAPABILITY_KEYS = [
  "realtimeQuotes",
  "intradayCharts",
  "analystInsights",
  "insiderTrades",
  "ownership",
  "etfHoldings",
  "secFilings",
  "economics",
  "esg",
  "dcf",
  "earningsTranscripts",
  "globalCoverage",
] as const

export type FmpCapabilityKey = (typeof FMP_CAPABILITY_KEYS)[number]

export interface FmpCapabilities {
  realtimeQuotes: boolean
  intradayCharts: boolean
  analystInsights: boolean
  insiderTrades: boolean
  ownership: boolean
  etfHoldings: boolean
  secFilings: boolean
  economics: boolean
  esg: boolean
  dcf: boolean
  earningsTranscripts: boolean
  globalCoverage: boolean
}

export interface MarketPlanSummary {
  tier: FmpPlanTier
  label: string
  quoteFreshnessLabel: string
  historicalRangeLabel: string
  requestBudgetLabel: string
  watchlistLimit: number
  capabilities: FmpCapabilities
}

export interface SymbolDirectoryEntry {
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
  updatedAt: string
}

export interface MarketSearchResult {
  symbol: string
  name: string
  exchangeShortName: string | null
  exchange: string | null
  type: string | null
  currency: string | null
  sector: string | null
  industry: string | null
}

export interface QuoteSnapshot {
  symbol: string
  name: string
  price: number | null
  change: number | null
  changesPercentage: number | null
  open: number | null
  dayLow: number | null
  dayHigh: number | null
  yearLow: number | null
  yearHigh: number | null
  volume: number | null
  avgVolume: number | null
  marketCap: number | null
  priceAvg50: number | null
  priceAvg200: number | null
  exchange: string | null
  currency: string | null
  timestamp: string | null
}

export interface MarketMoverBucket {
  label: string
  items: QuoteSnapshot[]
}

export interface SectorSnapshot {
  sector: string
  changePercentage: number | null
}

export interface CalendarEvent {
  symbol: string
  name: string
  eventType: "earnings" | "dividend" | "split" | "economic"
  eventDate: string
  time: string | null
  value: string | null
  estimate: string | null
}

export interface NewsStory {
  id: string
  symbol: string | null
  title: string
  text: string | null
  url: string
  site: string | null
  image: string | null
  publishedAt: string | null
}

export interface MacroRate {
  label: string
  value: number | null
  previous: number | null
  date: string | null
}

export interface PricePoint {
  date: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
}

export interface CompanyProfile {
  symbol: string
  companyName: string
  exchangeShortName: string | null
  sector: string | null
  industry: string | null
  website: string | null
  description: string | null
  ceo: string | null
  country: string | null
  city: string | null
  state: string | null
  employees: number | null
  ipoDate: string | null
  beta: number | null
  marketCap: number | null
  image: string | null
}

export interface MetricStat {
  label: string
  value: number | string | null
  changeHint?: string | null
}

export interface StatementRow {
  label: string
  values: (number | string | null)[]
}

export interface StatementTable {
  title: string
  columns: string[]
  rows: StatementRow[]
}

export interface AnalystSummary {
  targetLow: number | null
  targetHigh: number | null
  targetConsensus: number | null
  ratingSummary: string | null
  grades: {
    date: string | null
    provider: string | null
    grade: string | null
  }[]
}

export interface FilingEntry {
  formType: string | null
  filingDate: string | null
  acceptedDate: string | null
  description: string | null
  finalLink: string | null
}

export interface InsiderTradeEntry {
  reportingName: string | null
  transactionType: string | null
  securitiesOwned: number | null
  price: number | null
  filingDate: string | null
}

export interface OwnershipEntry {
  holder: string | null
  dateReported: string | null
  shares: number | null
  weightPercentage: number | null
}

export interface EtfExposureEntry {
  symbol: string | null
  etfName: string | null
  sharesNumber: number | null
  weightPercentage: number | null
}

export interface ValuationSnapshot {
  dcf: number | null
  marketCap: number | null
  enterpriseValue: number | null
  ownerEarnings: number | null
}

export interface LockedMarketSection {
  title: string
  capability: FmpCapabilityKey
  description: string
}

export interface StockDossier {
  symbol: string
  generatedAt: string
  plan: MarketPlanSummary
  profile: CompanyProfile | null
  quote: QuoteSnapshot | null
  chart: PricePoint[]
  headlineStats: MetricStat[]
  valuation: ValuationSnapshot | null
  statements: StatementTable[]
  growth: MetricStat[]
  calendar: CalendarEvent[]
  news: NewsStory[]
  analyst: AnalystSummary | null
  filings: FilingEntry[]
  insiderTrades: InsiderTradeEntry[]
  ownership: OwnershipEntry[]
  etfExposure: EtfExposureEntry[]
  lockedSections: LockedMarketSection[]
}

export interface MarketOverviewData {
  plan: MarketPlanSummary
  watchlist: {
    id: string | null
    name: string
    quotes: QuoteSnapshot[]
  }
  indexes: QuoteSnapshot[]
  movers: MarketMoverBucket[]
  sectors: SectorSnapshot[]
  calendar: CalendarEvent[]
  macro: MacroRate[]
  news: NewsStory[]
  warnings: string[]
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
  exchange?: string
}

export interface SavedScreenerRecord {
  id: string
  name: string
  filters: ScreenerFilterState
  createdAt: string
  updatedAt: string
}
