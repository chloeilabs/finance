export type InstrumentKind = "stock" | "etf"

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
  instrumentKind?: InstrumentKind
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
  dividendYieldTtm?: number | null
  dividendPerShareTtm?: number | null
  dividendPayoutRatioTtm?: number | null
  dcf?: number | null
  altmanZScore?: number | null
  piotroskiScore?: number | null
  fcfYield?: number | null
  freeFloatPercentage?: number | null
  floatShares?: number | null
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
  yield?: number | null
  recordDate?: string | null
  paymentDate?: string | null
  declarationDate?: string | null
  frequency?: string | null
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
  adjustedClose?: number | null
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

export interface DividendSnapshot {
  dividendYieldTtm: number | null
  dividendPerShareTtm: number | null
  dividendPayoutRatioTtm: number | null
  latestDividendPerShare: number | null
  latestDividendYield: number | null
  latestDividendDate: string | null
  latestRecordDate: string | null
  latestPaymentDate: string | null
  latestDeclarationDate: string | null
  frequency: string | null
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
