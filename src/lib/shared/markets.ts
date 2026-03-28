export const FMP_PLAN_TIERS = [
  "BASIC",
  "STARTER",
  "PREMIUM",
  "ULTIMATE",
] as const

export type FmpPlanTier = (typeof FMP_PLAN_TIERS)[number]

export const FMP_INTRADAY_INTERVALS = [
  "1min",
  "5min",
  "15min",
  "30min",
  "1hour",
  "4hour",
] as const

export type FmpIntradayInterval = (typeof FMP_INTRADAY_INTERVALS)[number]

export const MARKET_SCREENER_SORT_KEYS = [
  "symbol",
  "marketCap",
  "price",
  "volume",
  "beta",
  "dividend",
] as const

export type MarketScreenerSortKey = (typeof MARKET_SCREENER_SORT_KEYS)[number]

export type SortDirection = "asc" | "desc"

export type FmpCoverageScope = "sample" | "us" | "usUkCanada" | "global"

export const FMP_CAPABILITY_KEYS = [
  "realtimeQuotes",
  "intradayCharts",
  "batchQuotes",
  "batchIndexQuotes",
  "analystInsights",
  "insiderTrades",
  "ownership",
  "etfAssetExposure",
  "secFilings",
  "economics",
  "esgRatings",
  "dcf",
  "earningsTranscripts",
  "pressReleases",
  "globalCoverage",
] as const

export type FmpCapabilityKey = (typeof FMP_CAPABILITY_KEYS)[number]

export interface FmpCapabilities {
  realtimeQuotes: boolean
  intradayCharts: boolean
  batchQuotes: boolean
  batchIndexQuotes: boolean
  analystInsights: boolean
  insiderTrades: boolean
  ownership: boolean
  etfAssetExposure: boolean
  secFilings: boolean
  economics: boolean
  esgRatings: boolean
  dcf: boolean
  earningsTranscripts: boolean
  pressReleases: boolean
  globalCoverage: boolean
  coverageScope: FmpCoverageScope
  intradayIntervals: FmpIntradayInterval[]
}

export interface MarketPlanSummary {
  tier: FmpPlanTier
  label: string
  quoteFreshnessLabel: string
  historicalRangeLabel: string
  requestBudgetLabel: string
  bandwidthLimitLabel: string
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
  price?: number | null
  marketCap?: number | null
  volume?: number | null
  beta?: number | null
  dividend?: number | null
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

export interface TechnicalIndicatorPoint {
  date: string
  value: number | null
}

export interface TechnicalIndicatorSeries {
  id: string
  label: string
  points: TechnicalIndicatorPoint[]
}

export interface AftermarketSnapshot {
  lastTradePrice: number | null
  lastTradeTimestamp: string | null
  bidPrice: number | null
  askPrice: number | null
  volume: number | null
  quoteTimestamp: string | null
}

export interface PriceChangeSnapshot {
  day1: number | null
  day5: number | null
  month1: number | null
  month3: number | null
  month6: number | null
  ytd: number | null
  year1: number | null
  year3: number | null
  year5: number | null
  year10: number | null
  max: number | null
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

export interface FinancialScoreSnapshot {
  altmanZScore: number | null
  piotroskiScore: number | null
  workingCapital: number | null
  totalAssets: number | null
  retainedEarnings: number | null
  ebit: number | null
  marketCap: number | null
  totalLiabilities: number | null
  revenue: number | null
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

export interface AnalystEstimateSnapshot {
  date: string | null
  revenueLow: number | null
  revenueHigh: number | null
  revenueAvg: number | null
  ebitdaLow: number | null
  ebitdaHigh: number | null
  ebitdaAvg: number | null
  epsLow: number | null
  epsHigh: number | null
  epsAvg: number | null
  numberAnalystsRevenue: number | null
  numberAnalystsEps: number | null
}

export interface GradesConsensus {
  strongBuy: number | null
  buy: number | null
  hold: number | null
  sell: number | null
  strongSell: number | null
  consensus: string | null
}

export interface RatingsHistoricalEntry {
  date: string | null
  rating: string | null
  overallScore: number | null
  discountedCashFlowScore: number | null
  returnOnEquityScore: number | null
  returnOnAssetsScore: number | null
  debtToEquityScore: number | null
  peScore: number | null
  pbScore: number | null
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

export interface RevenueSegment {
  label: string
  value: number | null
}

export interface RevenueSegmentation {
  date: string | null
  fiscalYear: number | null
  period: string | null
  segments: RevenueSegment[]
}

export interface MarketCapPoint {
  date: string
  marketCap: number | null
}

export interface EmployeeCountPoint {
  acceptanceTime: string | null
  periodOfReport: string | null
  employeeCount: number | null
}

export interface SecProfile {
  cik: string | null
  registrantName: string | null
  sicCode: string | null
  sicDescription: string | null
  sicGroup: string | null
}

export interface PeerComparisonRow {
  symbol: string
  companyName: string | null
  price: number | null
  changesPercentage: number | null
  marketCap: number | null
  peRatio: number | null
  fcfYield: number | null
  roic: number | null
  altmanZScore: number | null
  piotroskiScore: number | null
  analystConsensus: string | null
}

export interface ResearchQuoteRow {
  symbol: string
  name: string | null
  currency: string | null
  price: number | null
  changesPercentage: number | null
  marketCap: number | null
  rsi14: number | null
  nextEarningsDate: string | null
  analystConsensus: string | null
  piotroskiScore: number | null
  altmanZScore: number | null
}

export interface MarketHoursSnapshot {
  exchange: string
  name: string | null
  openingHour: string | null
  closingHour: string | null
  timezone: string | null
  isMarketOpen: boolean
}

export interface MarketHoliday {
  exchange: string
  date: string | null
  name: string | null
  isClosed: boolean
  adjOpenTime: string | null
  adjCloseTime: string | null
}

export interface SectorValuationSnapshot {
  date: string | null
  sector: string
  exchange: string | null
  pe: number | null
}

export interface SectorHistoryPoint {
  date: string
  averageChange: number | null
}

export interface SectorHistorySeries {
  sector: string
  points: SectorHistoryPoint[]
}

export interface RiskPremiumSnapshot {
  country: string
  countryRiskPremium: number | null
  totalEquityRiskPremium: number | null
}

export interface ScreenerOptions {
  exchanges: string[]
  sectors: string[]
  industries: string[]
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
  intradayCharts: Partial<Record<FmpIntradayInterval, PricePoint[]>>
  aftermarket: AftermarketSnapshot | null
  priceChange: PriceChangeSnapshot | null
  technicals: TechnicalIndicatorSeries[]
  headlineStats: MetricStat[]
  financialScores: FinancialScoreSnapshot | null
  valuation: ValuationSnapshot | null
  statements: StatementTable[]
  growth: MetricStat[]
  calendar: CalendarEvent[]
  news: NewsStory[]
  analyst: AnalystSummary | null
  gradesConsensus: GradesConsensus | null
  analystEstimates: AnalystEstimateSnapshot[]
  ratingsHistory: RatingsHistoricalEntry[]
  filings: FilingEntry[]
  insiderTrades: InsiderTradeEntry[]
  ownership: OwnershipEntry[]
  etfExposure: EtfExposureEntry[]
  productSegments: RevenueSegmentation | null
  geographicSegments: RevenueSegmentation | null
  marketCapHistory: MarketCapPoint[]
  employeeHistory: EmployeeCountPoint[]
  secProfile: SecProfile | null
  peers: PeerComparisonRow[]
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
  sectorValuations: SectorValuationSnapshot[]
  sectorHistory: SectorHistorySeries[]
  calendar: CalendarEvent[]
  macro: MacroRate[]
  economicCalendar: CalendarEvent[]
  marketHours: MarketHoursSnapshot[]
  marketHolidays: MarketHoliday[]
  riskPremium: RiskPremiumSnapshot | null
  news: NewsStory[]
  generalNews: NewsStory[]
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
  watchlist: WatchlistRecord | null
  rows: ResearchQuoteRow[]
  plan: MarketPlanSummary
}
