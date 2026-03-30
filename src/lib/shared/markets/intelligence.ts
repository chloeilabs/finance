import type {
  AftermarketSnapshot,
  CalendarEvent,
  CompanyProfile,
  FinancialScoreSnapshot,
  MacroRate,
  MarketMoverBucket,
  MetricStat,
  NewsStory,
  PriceChangeSnapshot,
  PricePoint,
  QuoteSnapshot,
  SectorSnapshot,
  StatementTable,
  TechnicalIndicatorSeries,
} from "./core"
import type {
  FmpCapabilityKey,
  FmpIntradayInterval,
  MarketPlanSummary,
} from "./plan"

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
  symbol: string | null
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

export interface LatestInsiderTradeEntry {
  symbol: string
  reportingName: string | null
  transactionType: string | null
  securitiesTransacted: number | null
  price: number | null
  filingDate: string | null
  transactionDate: string | null
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

export interface ExecutiveEntry {
  name: string | null
  title: string | null
  pay: number | null
  currencyPay: string | null
}

export interface ShareFloatSnapshot {
  date: string | null
  freeFloatPercentage: number | null
  floatShares: number | null
  outstandingShares: number | null
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
  dcf: number | null
  freeFloatPercentage: number | null
  floatShares: number | null
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
  fcfYield: number | null
  roic: number | null
  dcf: number | null
  freeFloatPercentage: number | null
  floatShares: number | null
}

export type AssetMarketGroupId = "crypto" | "forex" | "commodities"

export interface AssetSnapshot {
  symbol: string
  quote: QuoteSnapshot | null
  intradayChart: PricePoint[]
  eodChart: PricePoint[]
}

export interface AssetMarketGroup {
  id: AssetMarketGroupId
  title: string
  description: string
  items: AssetSnapshot[]
}

export interface MultiAssetMarketData {
  plan: MarketPlanSummary
  groups: AssetMarketGroup[]
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
  executives: ExecutiveEntry[]
  shareFloat: ShareFloatSnapshot | null
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
    sparklines: Record<string, number[]>
  }
  indexes: QuoteSnapshot[]
  indexSparklines: Record<string, number[]>
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
