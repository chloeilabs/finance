import {
  createMarketDateClock,
  type MarketDateClock,
} from "./market-clock.ts"
import type {
  FmpCapabilityKey,
  FmpIntradayInterval,
} from "./plan.ts"

export const STARTER_DATASET_CATEGORIES = [
  "quotes",
  "charts",
  "directory",
  "profile",
  "fundamentals",
  "calendar",
  "news",
  "analyst",
  "filings",
  "macro",
  "marketStructure",
  "breadth",
] as const

export type StarterDatasetCategory =
  (typeof STARTER_DATASET_CATEGORIES)[number]

export const STARTER_DATASET_IDS = [
  "quote",
  "quote-short",
  "crypto-quote",
  "forex-quote",
  "commodity-quote",
  "aftermarket-trade",
  "aftermarket-quote",
  "stock-price-change",
  "batch-quote",
  "batch-index-quotes",
  "biggest-gainers",
  "biggest-losers",
  "most-actives",
  "sector-performance-snapshot",
  "historical-price-eod-light",
  "historical-chart-1min",
  "historical-chart-5min",
  "crypto-historical-chart-5min",
  "forex-historical-chart-5min",
  "commodity-historical-chart-5min",
  "historical-chart-15min",
  "historical-chart-30min",
  "historical-chart-1hour",
  "historical-chart-4hour",
  "technical-indicators-rsi",
  "search-symbol",
  "search-name",
  "company-screener",
  "actively-trading-list",
  "etf-list",
  "available-exchanges",
  "available-sectors",
  "available-industries",
  "available-countries",
  "profile",
  "stock-peers",
  "historical-market-capitalization",
  "historical-employee-count",
  "employee-count",
  "revenue-product-segmentation",
  "revenue-geographic-segmentation",
  "sec-profile",
  "key-executives",
  "shares-float",
  "institutional-ownership",
  "etf-asset-exposure",
  "key-metrics-ttm",
  "ratios-ttm",
  "income-statement",
  "balance-sheet-statement",
  "cash-flow-statement",
  "income-statement-growth",
  "ratings-snapshot",
  "financial-scores",
  "levered-discounted-cash-flow",
  "enterprise-values",
  "owner-earnings",
  "esg-ratings",
  "dividends",
  "dividends-calendar",
  "earnings",
  "earnings-calendar",
  "splits",
  "splits-calendar",
  "ipos-calendar",
  "sec-filings-search-symbol",
  "news-stock-latest",
  "news-general-latest",
  "news-stock",
  "news-press-releases",
  "fmp-articles",
  "price-target-consensus",
  "grades",
  "grades-consensus",
  "analyst-estimates",
  "ratings-historical",
  "earning-call-transcript",
  "treasury-rates",
  "economic-indicators",
  "economic-calendar",
  "market-risk-premium",
  "exchange-market-hours",
  "all-exchange-market-hours",
  "holidays-by-exchange",
  "sector-pe-snapshot",
  "historical-sector-performance",
  "insider-trading",
  "insider-trading-latest",
] as const

export type StarterDatasetId = (typeof STARTER_DATASET_IDS)[number]

export type StarterDatasetQueryValue = string | number | boolean
export type StarterDatasetQuery = Partial<
  Record<string, StarterDatasetQueryValue>
>

export interface StarterDatasetQueryFieldOption {
  label: string
  value: string
}

export interface StarterDatasetQueryField {
  defaultValue?: StarterDatasetQueryValue
  description?: string
  key: string
  label: string
  options?: StarterDatasetQueryFieldOption[]
  placeholder?: string
  required?: boolean
  type: "boolean" | "date" | "number" | "select" | "text"
}

export interface StarterDatasetDefinitionTemplate {
  category: StarterDatasetCategory
  defaultParams?:
    | StarterDatasetQuery
    | ((clock: MarketDateClock) => StarterDatasetQuery)
  description: string
  docsUrl: string
  id: StarterDatasetId
  label: string
  path: string
  probeParams?:
    | StarterDatasetQuery
    | ((clock: MarketDateClock) => StarterDatasetQuery)
  queryFields?: StarterDatasetQueryField[]
  starterAvailability: "accessible" | "restricted"
  ttlSeconds: number
}

export interface StarterDatasetDefinition
  extends Omit<
    StarterDatasetDefinitionTemplate,
    "defaultParams" | "probeParams"
  > {
  defaultParams: StarterDatasetQuery
  probeParams: StarterDatasetQuery
}

export type StarterDatasetResultRow = Record<string, unknown>

export interface StarterDatasetResult {
  columns: string[]
  datasetId: StarterDatasetId
  fetchedAt: string
  raw: unknown
  rows: StarterDatasetResultRow[]
}

const STABLE_DOCS_URL = "https://site.financialmodelingprep.com/developer/docs"
const DAY_TTL_SECONDS = 60 * 60 * 24
const HOUR_TTL_SECONDS = 60 * 60
const HALF_HOUR_TTL_SECONDS = 60 * 30
const FIFTEEN_MINUTES_TTL_SECONDS = 60 * 15
const FIVE_MINUTES_TTL_SECONDS = 60 * 5
const THREE_MINUTES_TTL_SECONDS = 60 * 3

const SYMBOL_FIELD: StarterDatasetQueryField = {
  defaultValue: "AAPL",
  key: "symbol",
  label: "Symbol",
  placeholder: "AAPL",
  required: true,
  type: "text",
}

const SYMBOLS_FIELD: StarterDatasetQueryField = {
  defaultValue: "AAPL,MSFT",
  key: "symbols",
  label: "Symbols",
  placeholder: "AAPL,MSFT",
  required: true,
  type: "text",
}

const QUERY_FIELD: StarterDatasetQueryField = {
  defaultValue: "apple",
  key: "query",
  label: "Query",
  placeholder: "apple",
  required: true,
  type: "text",
}

const LIMIT_FIELD: StarterDatasetQueryField = {
  defaultValue: 10,
  key: "limit",
  label: "Limit",
  type: "number",
}

const PAGE_FIELD: StarterDatasetQueryField = {
  defaultValue: 0,
  key: "page",
  label: "Page",
  type: "number",
}

const FROM_FIELD: StarterDatasetQueryField = {
  key: "from",
  label: "From",
  required: true,
  type: "date",
}

const TO_FIELD: StarterDatasetQueryField = {
  key: "to",
  label: "To",
  required: true,
  type: "date",
}

const DATE_FIELD: StarterDatasetQueryField = {
  key: "date",
  label: "Date",
  type: "date",
}

const EXCHANGE_FIELD: StarterDatasetQueryField = {
  defaultValue: "NASDAQ",
  key: "exchange",
  label: "Exchange",
  placeholder: "NASDAQ",
  required: true,
  type: "text",
}

const SECTOR_FIELD: StarterDatasetQueryField = {
  defaultValue: "Technology",
  key: "sector",
  label: "Sector",
  placeholder: "Technology",
  required: true,
  type: "text",
}

const NAME_FIELD: StarterDatasetQueryField = {
  defaultValue: "GDP",
  key: "name",
  label: "Indicator",
  options: [
    { label: "GDP", value: "GDP" },
    { label: "CPI", value: "CPI" },
    { label: "Unemployment Rate", value: "Unemployment Rate" },
  ],
  required: true,
  type: "select",
}

const YEAR_FIELD: StarterDatasetQueryField = {
  defaultValue: 2025,
  key: "year",
  label: "Year",
  required: true,
  type: "number",
}

const QUARTER_FIELD: StarterDatasetQueryField = {
  defaultValue: 4,
  key: "quarter",
  label: "Quarter",
  options: [
    { label: "Q1", value: "1" },
    { label: "Q2", value: "2" },
    { label: "Q3", value: "3" },
    { label: "Q4", value: "4" },
  ],
  required: true,
  type: "select",
}

const COMPANY_SCREENER_FIELDS: StarterDatasetQueryField[] = [
  {
    defaultValue: 5_000_000_000,
    key: "marketCapMoreThan",
    label: "Market cap >",
    type: "number",
  },
  {
    defaultValue: 1_000_000,
    key: "volumeMoreThan",
    label: "Volume >",
    type: "number",
  },
  {
    defaultValue: true,
    key: "isActivelyTrading",
    label: "Actively trading",
    type: "boolean",
  },
  {
    defaultValue: "Technology",
    key: "sector",
    label: "Sector",
    placeholder: "Technology",
    type: "text",
  },
  LIMIT_FIELD,
] as const

function resolveQuery(
  value:
    | StarterDatasetQuery
    | ((clock: MarketDateClock) => StarterDatasetQuery)
    | undefined,
  clock: MarketDateClock
): StarterDatasetQuery {
  if (!value) {
    return {}
  }

  return typeof value === "function" ? value(clock) : { ...value }
}

function resolveQueryFieldDefaults(
  fields: readonly StarterDatasetQueryField[] | undefined
): StarterDatasetQuery {
  if (!fields) {
    return {}
  }

  const defaults: StarterDatasetQuery = {}

  for (const field of fields) {
    if (field.defaultValue === undefined) {
      continue
    }

    defaults[field.key] = field.defaultValue
  }

  return defaults
}

const DATASET_DEFINITIONS: StarterDatasetDefinitionTemplate[] = [
  {
    category: "quotes",
    description: "Full real-time quote snapshot for a single symbol.",
    docsUrl: STABLE_DOCS_URL,
    id: "quote",
    label: "Quote",
    path: "/stable/quote",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Compact quote payload with price, change, and volume.",
    docsUrl: STABLE_DOCS_URL,
    id: "quote-short",
    label: "Quote Short",
    path: "/stable/quote-short",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    defaultParams: {
      symbol: "BTCUSD",
    },
    description: "Starter-safe crypto quote coverage.",
    docsUrl: STABLE_DOCS_URL,
    id: "crypto-quote",
    label: "Crypto Quote",
    path: "/stable/quote",
    probeParams: {
      symbol: "BTCUSD",
    },
    queryFields: [
      {
        defaultValue: "BTCUSD",
        key: "symbol",
        label: "Crypto symbol",
        placeholder: "BTCUSD",
        required: true,
        type: "text",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    defaultParams: {
      symbol: "EURUSD",
    },
    description: "Starter-safe forex quote coverage.",
    docsUrl: STABLE_DOCS_URL,
    id: "forex-quote",
    label: "Forex Quote",
    path: "/stable/quote",
    probeParams: {
      symbol: "EURUSD",
    },
    queryFields: [
      {
        defaultValue: "EURUSD",
        key: "symbol",
        label: "FX symbol",
        placeholder: "EURUSD",
        required: true,
        type: "text",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    defaultParams: {
      symbol: "GCUSD",
    },
    description: "Starter-safe commodity quote coverage.",
    docsUrl: STABLE_DOCS_URL,
    id: "commodity-quote",
    label: "Commodity Quote",
    path: "/stable/quote",
    probeParams: {
      symbol: "GCUSD",
    },
    queryFields: [
      {
        defaultValue: "GCUSD",
        key: "symbol",
        label: "Commodity symbol",
        placeholder: "GCUSD",
        required: true,
        type: "text",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Latest aftermarket trade for a US equity.",
    docsUrl: STABLE_DOCS_URL,
    id: "aftermarket-trade",
    label: "Aftermarket Trade",
    path: "/stable/aftermarket-trade",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: THREE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Latest aftermarket quote with bid/ask context.",
    docsUrl: STABLE_DOCS_URL,
    id: "aftermarket-quote",
    label: "Aftermarket Quote",
    path: "/stable/aftermarket-quote",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: THREE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Multi-period price change snapshot for a symbol.",
    docsUrl: STABLE_DOCS_URL,
    id: "stock-price-change",
    label: "Stock Price Change",
    path: "/stable/stock-price-change",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Batch live quotes for multiple symbols.",
    docsUrl: STABLE_DOCS_URL,
    id: "batch-quote",
    label: "Batch Quote",
    path: "/stable/batch-quote",
    queryFields: [SYMBOLS_FIELD],
    starterAvailability: "restricted",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Batch live quote snapshots for major indexes.",
    docsUrl: STABLE_DOCS_URL,
    id: "batch-index-quotes",
    label: "Batch Index Quotes",
    path: "/stable/batch-index-quotes",
    starterAvailability: "restricted",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Current top gainers in the US market feed.",
    docsUrl: STABLE_DOCS_URL,
    id: "biggest-gainers",
    label: "Biggest Gainers",
    path: "/stable/biggest-gainers",
    starterAvailability: "accessible",
    ttlSeconds: THREE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Current top losers in the US market feed.",
    docsUrl: STABLE_DOCS_URL,
    id: "biggest-losers",
    label: "Biggest Losers",
    path: "/stable/biggest-losers",
    starterAvailability: "accessible",
    ttlSeconds: THREE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    description: "Current most-active US equities.",
    docsUrl: STABLE_DOCS_URL,
    id: "most-actives",
    label: "Most Active",
    path: "/stable/most-actives",
    starterAvailability: "accessible",
    ttlSeconds: THREE_MINUTES_TTL_SECONDS,
  },
  {
    category: "quotes",
    defaultParams: (clock) => ({
      date: clock.today,
    }),
    description: "Latest sector-performance snapshot for a given day.",
    docsUrl: STABLE_DOCS_URL,
    id: "sector-performance-snapshot",
    label: "Sector Performance Snapshot",
    path: "/stable/sector-performance-snapshot",
    probeParams: (clock) => ({
      date: clock.today,
    }),
    queryFields: [DATE_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HALF_HOUR_TTL_SECONDS,
  },
  {
    category: "charts",
    defaultParams: {
      limit: 30,
      symbol: "AAPL",
    },
    description: "Historical end-of-day OHLCV light payload.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-price-eod-light",
    label: "Historical Price EOD Light",
    path: "/stable/historical-price-eod/light",
    queryFields: [SYMBOL_FIELD, LIMIT_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    description: "One-minute intraday chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-chart-1min",
    label: "Historical Chart 1m",
    path: "/stable/historical-chart/1min",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "restricted",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    description: "Five-minute intraday chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-chart-5min",
    label: "Historical Chart 5m",
    path: "/stable/historical-chart/5min",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    defaultParams: {
      symbol: "BTCUSD",
    },
    description: "Starter-safe five-minute crypto chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "crypto-historical-chart-5min",
    label: "Crypto Historical Chart 5m",
    path: "/stable/historical-chart/5min",
    probeParams: {
      symbol: "BTCUSD",
    },
    queryFields: [
      {
        defaultValue: "BTCUSD",
        key: "symbol",
        label: "Crypto symbol",
        placeholder: "BTCUSD",
        required: true,
        type: "text",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    defaultParams: {
      symbol: "EURUSD",
    },
    description: "Starter-safe five-minute forex chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "forex-historical-chart-5min",
    label: "Forex Historical Chart 5m",
    path: "/stable/historical-chart/5min",
    probeParams: {
      symbol: "EURUSD",
    },
    queryFields: [
      {
        defaultValue: "EURUSD",
        key: "symbol",
        label: "FX symbol",
        placeholder: "EURUSD",
        required: true,
        type: "text",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    defaultParams: {
      symbol: "GCUSD",
    },
    description: "Starter-safe five-minute commodity chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "commodity-historical-chart-5min",
    label: "Commodity Historical Chart 5m",
    path: "/stable/historical-chart/5min",
    probeParams: {
      symbol: "GCUSD",
    },
    queryFields: [
      {
        defaultValue: "GCUSD",
        key: "symbol",
        label: "Commodity symbol",
        placeholder: "GCUSD",
        required: true,
        type: "text",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    description: "Fifteen-minute intraday chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-chart-15min",
    label: "Historical Chart 15m",
    path: "/stable/historical-chart/15min",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    description: "Thirty-minute intraday chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-chart-30min",
    label: "Historical Chart 30m",
    path: "/stable/historical-chart/30min",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    description: "One-hour intraday chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-chart-1hour",
    label: "Historical Chart 1h",
    path: "/stable/historical-chart/1hour",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    description: "Four-hour intraday chart bars.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-chart-4hour",
    label: "Historical Chart 4h",
    path: "/stable/historical-chart/4hour",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "charts",
    defaultParams: {
      periodLength: 14,
      symbol: "AAPL",
      timeframe: "1day",
    },
    description: "RSI technical indicator series.",
    docsUrl: STABLE_DOCS_URL,
    id: "technical-indicators-rsi",
    label: "Technical Indicator RSI",
    path: "/stable/technical-indicators/rsi",
    queryFields: [
      SYMBOL_FIELD,
      {
        defaultValue: 14,
        key: "periodLength",
        label: "Period length",
        type: "number",
      },
      {
        defaultValue: "1day",
        key: "timeframe",
        label: "Timeframe",
        options: [
          { label: "1 day", value: "1day" },
          { label: "5 min", value: "5min" },
          { label: "15 min", value: "15min" },
        ],
        type: "select",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: FIFTEEN_MINUTES_TTL_SECONDS,
  },
  {
    category: "directory",
    defaultParams: {
      query: "AAPL",
    },
    description: "Symbol search across tradable equities and ETFs.",
    docsUrl: STABLE_DOCS_URL,
    id: "search-symbol",
    label: "Search Symbol",
    path: "/stable/search-symbol",
    probeParams: {
      query: "AAPL",
    },
    queryFields: [
      {
        ...QUERY_FIELD,
        defaultValue: "AAPL",
        placeholder: "AAPL",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "directory",
    defaultParams: {
      query: "Apple",
    },
    description: "Company-name search across tradable equities and ETFs.",
    docsUrl: STABLE_DOCS_URL,
    id: "search-name",
    label: "Search Name",
    path: "/stable/search-name",
    probeParams: {
      query: "Apple",
    },
    queryFields: [
      {
        ...QUERY_FIELD,
        defaultValue: "Apple",
        placeholder: "Apple",
      },
    ],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "directory",
    defaultParams: {
      isActivelyTrading: true,
      limit: 25,
      sector: "Technology",
    },
    description: "Flexible company screener with price, volume, and sector filters.",
    docsUrl: STABLE_DOCS_URL,
    id: "company-screener",
    label: "Company Screener",
    path: "/stable/company-screener",
    queryFields: COMPANY_SCREENER_FIELDS,
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "directory",
    description: "Actively trading symbol directory.",
    docsUrl: STABLE_DOCS_URL,
    id: "actively-trading-list",
    label: "Actively Trading List",
    path: "/stable/actively-trading-list",
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "directory",
    description: "ETF symbol directory.",
    docsUrl: STABLE_DOCS_URL,
    id: "etf-list",
    label: "ETF List",
    path: "/stable/etf-list",
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "directory",
    description: "Available exchange list for search and screen filters.",
    docsUrl: STABLE_DOCS_URL,
    id: "available-exchanges",
    label: "Available Exchanges",
    path: "/stable/available-exchanges",
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "directory",
    description: "Available sector list for screen filters.",
    docsUrl: STABLE_DOCS_URL,
    id: "available-sectors",
    label: "Available Sectors",
    path: "/stable/available-sectors",
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "directory",
    description: "Available industry list for screen filters.",
    docsUrl: STABLE_DOCS_URL,
    id: "available-industries",
    label: "Available Industries",
    path: "/stable/available-industries",
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "directory",
    description: "Available country list for reference screens.",
    docsUrl: STABLE_DOCS_URL,
    id: "available-countries",
    label: "Available Countries",
    path: "/stable/available-countries",
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "Company profile with business, market-cap, and company metadata.",
    docsUrl: STABLE_DOCS_URL,
    id: "profile",
    label: "Profile",
    path: "/stable/profile",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "Peer symbol list for a given company.",
    docsUrl: STABLE_DOCS_URL,
    id: "stock-peers",
    label: "Stock Peers",
    path: "/stable/stock-peers",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    defaultParams: {
      limit: 20,
      symbol: "AAPL",
    },
    description: "Historical market-cap series for a company.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-market-capitalization",
    label: "Historical Market Capitalization",
    path: "/stable/historical-market-capitalization",
    queryFields: [SYMBOL_FIELD, LIMIT_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "Historical employee-count series parsed from filings.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-employee-count",
    label: "Historical Employee Count",
    path: "/stable/historical-employee-count",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "Latest employee-count snapshot for a company.",
    docsUrl: STABLE_DOCS_URL,
    id: "employee-count",
    label: "Employee Count",
    path: "/stable/employee-count",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "Revenue breakdown by product segment.",
    docsUrl: STABLE_DOCS_URL,
    id: "revenue-product-segmentation",
    label: "Revenue Product Segmentation",
    path: "/stable/revenue-product-segmentation",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "Revenue breakdown by geography.",
    docsUrl: STABLE_DOCS_URL,
    id: "revenue-geographic-segmentation",
    label: "Revenue Geographic Segmentation",
    path: "/stable/revenue-geographic-segmentation",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "SEC registrant metadata for a company.",
    docsUrl: STABLE_DOCS_URL,
    id: "sec-profile",
    label: "SEC Profile",
    path: "/stable/sec-profile",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "Key-executive roster and compensation summary.",
    docsUrl: STABLE_DOCS_URL,
    id: "key-executives",
    label: "Key Executives",
    path: "/stable/key-executives",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "Share float and outstanding-share snapshot.",
    docsUrl: STABLE_DOCS_URL,
    id: "shares-float",
    label: "Shares Float",
    path: "/stable/shares-float",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    defaultParams: {
      limit: 10,
      quarter: 4,
      symbol: "AAPL",
      year: 2025,
    },
    description: "Institutional ownership / 13F analytics by holder.",
    docsUrl: STABLE_DOCS_URL,
    id: "institutional-ownership",
    label: "Institutional Ownership",
    path: "/stable/institutional-ownership/extract-analytics/holder",
    queryFields: [SYMBOL_FIELD, YEAR_FIELD, QUARTER_FIELD, LIMIT_FIELD],
    starterAvailability: "restricted",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "profile",
    description: "ETF asset look-through for a single symbol.",
    docsUrl: STABLE_DOCS_URL,
    id: "etf-asset-exposure",
    label: "ETF Asset Exposure",
    path: "/stable/etf/asset-exposure",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "restricted",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "TTM key metrics including FCF yield and ROIC.",
    docsUrl: STABLE_DOCS_URL,
    id: "key-metrics-ttm",
    label: "Key Metrics TTM",
    path: "/stable/key-metrics-ttm",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "TTM ratios including dividend yield and payout ratio.",
    docsUrl: STABLE_DOCS_URL,
    id: "ratios-ttm",
    label: "Ratios TTM",
    path: "/stable/ratios-ttm",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Income statement history.",
    docsUrl: STABLE_DOCS_URL,
    id: "income-statement",
    label: "Income Statement",
    path: "/stable/income-statement",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Balance-sheet statement history.",
    docsUrl: STABLE_DOCS_URL,
    id: "balance-sheet-statement",
    label: "Balance Sheet Statement",
    path: "/stable/balance-sheet-statement",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Cash-flow statement history.",
    docsUrl: STABLE_DOCS_URL,
    id: "cash-flow-statement",
    label: "Cash Flow Statement",
    path: "/stable/cash-flow-statement",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Income-statement growth metrics.",
    docsUrl: STABLE_DOCS_URL,
    id: "income-statement-growth",
    label: "Income Statement Growth",
    path: "/stable/income-statement-growth",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Composite ratings snapshot from FMP methodology.",
    docsUrl: STABLE_DOCS_URL,
    id: "ratings-snapshot",
    label: "Ratings Snapshot",
    path: "/stable/ratings-snapshot",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Financial quality scores, including Altman and Piotroski.",
    docsUrl: STABLE_DOCS_URL,
    id: "financial-scores",
    label: "Financial Scores",
    path: "/stable/financial-scores",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Levered discounted cash-flow estimate.",
    docsUrl: STABLE_DOCS_URL,
    id: "levered-discounted-cash-flow",
    label: "Levered Discounted Cash Flow",
    path: "/stable/levered-discounted-cash-flow",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Enterprise-value history and valuation context.",
    docsUrl: STABLE_DOCS_URL,
    id: "enterprise-values",
    label: "Enterprise Values",
    path: "/stable/enterprise-values",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "Owner-earnings estimate for a company.",
    docsUrl: STABLE_DOCS_URL,
    id: "owner-earnings",
    label: "Owner Earnings",
    path: "/stable/owner-earnings",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "fundamentals",
    description: "ESG ratings snapshot.",
    docsUrl: STABLE_DOCS_URL,
    id: "esg-ratings",
    label: "ESG Ratings",
    path: "/stable/esg-ratings",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "restricted",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "calendar",
    description: "Dividend history and upcoming dividend events for a symbol.",
    docsUrl: STABLE_DOCS_URL,
    id: "dividends",
    label: "Dividends",
    path: "/stable/dividends",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "calendar",
    defaultParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    description: "Cross-market dividend calendar with event yields.",
    docsUrl: STABLE_DOCS_URL,
    id: "dividends-calendar",
    label: "Dividends Calendar",
    path: "/stable/dividends-calendar",
    probeParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    queryFields: [FROM_FIELD, TO_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "calendar",
    description: "Earnings history and upcoming reports for a symbol.",
    docsUrl: STABLE_DOCS_URL,
    id: "earnings",
    label: "Earnings",
    path: "/stable/earnings",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "calendar",
    defaultParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    description: "Cross-market earnings calendar.",
    docsUrl: STABLE_DOCS_URL,
    id: "earnings-calendar",
    label: "Earnings Calendar",
    path: "/stable/earnings-calendar",
    probeParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    queryFields: [FROM_FIELD, TO_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "calendar",
    description: "Split history for a symbol.",
    docsUrl: STABLE_DOCS_URL,
    id: "splits",
    label: "Splits",
    path: "/stable/splits",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "calendar",
    defaultParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    description: "Cross-market split calendar.",
    docsUrl: STABLE_DOCS_URL,
    id: "splits-calendar",
    label: "Splits Calendar",
    path: "/stable/splits-calendar",
    probeParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    queryFields: [FROM_FIELD, TO_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "calendar",
    defaultParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    description: "Upcoming IPO calendar.",
    docsUrl: STABLE_DOCS_URL,
    id: "ipos-calendar",
    label: "IPOs Calendar",
    path: "/stable/ipos-calendar",
    probeParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    queryFields: [FROM_FIELD, TO_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "filings",
    defaultParams: (clock) => ({
      from: clock.minusDays(180),
      page: 0,
      symbol: "AAPL",
      to: clock.today,
    }),
    description: "SEC filings search scoped to a symbol and date range.",
    docsUrl: STABLE_DOCS_URL,
    id: "sec-filings-search-symbol",
    label: "SEC Filings Search",
    path: "/stable/sec-filings-search/symbol",
    probeParams: (clock) => ({
      from: clock.minusDays(180),
      symbol: "AAPL",
      to: clock.today,
    }),
    queryFields: [SYMBOL_FIELD, FROM_FIELD, TO_FIELD, PAGE_FIELD, LIMIT_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "news",
    defaultParams: {
      limit: 10,
      page: 0,
    },
    description: "Latest stock-market news feed.",
    docsUrl: STABLE_DOCS_URL,
    id: "news-stock-latest",
    label: "Stock News Latest",
    path: "/stable/news/stock-latest",
    queryFields: [PAGE_FIELD, LIMIT_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "news",
    defaultParams: {
      limit: 10,
      page: 0,
    },
    description: "Latest general/macroeconomic news feed.",
    docsUrl: STABLE_DOCS_URL,
    id: "news-general-latest",
    label: "General News Latest",
    path: "/stable/news/general-latest",
    queryFields: [PAGE_FIELD, LIMIT_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "news",
    defaultParams: {
      limit: 10,
      page: 0,
      symbols: "AAPL",
    },
    description: "Symbol-scoped stock news search.",
    docsUrl: STABLE_DOCS_URL,
    id: "news-stock",
    label: "Stock News Search",
    path: "/stable/news/stock",
    queryFields: [SYMBOLS_FIELD, PAGE_FIELD, LIMIT_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "news",
    defaultParams: {
      limit: 10,
      page: 0,
      symbols: "AAPL",
    },
    description: "Official company press-release search.",
    docsUrl: STABLE_DOCS_URL,
    id: "news-press-releases",
    label: "Press Releases Search",
    path: "/stable/news/press-releases",
    queryFields: [SYMBOLS_FIELD, PAGE_FIELD, LIMIT_FIELD],
    starterAvailability: "restricted",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "news",
    defaultParams: {
      limit: 10,
      page: 0,
    },
    description: "FMP-authored market articles feed.",
    docsUrl: STABLE_DOCS_URL,
    id: "fmp-articles",
    label: "FMP Articles",
    path: "/stable/fmp-articles",
    queryFields: [PAGE_FIELD, LIMIT_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: FIVE_MINUTES_TTL_SECONDS,
  },
  {
    category: "analyst",
    description: "Analyst price-target consensus snapshot.",
    docsUrl: STABLE_DOCS_URL,
    id: "price-target-consensus",
    label: "Price Target Consensus",
    path: "/stable/price-target-consensus",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HALF_HOUR_TTL_SECONDS,
  },
  {
    category: "analyst",
    description: "Detailed analyst grades history.",
    docsUrl: STABLE_DOCS_URL,
    id: "grades",
    label: "Grades",
    path: "/stable/grades",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HALF_HOUR_TTL_SECONDS,
  },
  {
    category: "analyst",
    description: "Aggregated analyst grades consensus.",
    docsUrl: STABLE_DOCS_URL,
    id: "grades-consensus",
    label: "Grades Consensus",
    path: "/stable/grades-consensus",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HALF_HOUR_TTL_SECONDS,
  },
  {
    category: "analyst",
    defaultParams: {
      limit: 4,
      page: 0,
      period: "annual",
      symbol: "AAPL",
    },
    description: "Forward analyst estimates over multiple years.",
    docsUrl: STABLE_DOCS_URL,
    id: "analyst-estimates",
    label: "Analyst Estimates",
    path: "/stable/analyst-estimates",
    queryFields: [
      SYMBOL_FIELD,
      {
        defaultValue: "annual",
        key: "period",
        label: "Period",
        options: [
          { label: "Annual", value: "annual" },
          { label: "Quarter", value: "quarter" },
        ],
        type: "select",
      },
      PAGE_FIELD,
      LIMIT_FIELD,
    ],
    starterAvailability: "accessible",
    ttlSeconds: HALF_HOUR_TTL_SECONDS,
  },
  {
    category: "analyst",
    description: "Historical FMP rating scores for a company.",
    docsUrl: STABLE_DOCS_URL,
    id: "ratings-historical",
    label: "Ratings Historical",
    path: "/stable/ratings-historical",
    queryFields: [SYMBOL_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HALF_HOUR_TTL_SECONDS,
  },
  {
    category: "analyst",
    defaultParams: {
      quarter: 4,
      symbol: "AAPL",
      year: 2025,
    },
    description: "Full earnings-call transcript by symbol, year, and quarter.",
    docsUrl: STABLE_DOCS_URL,
    id: "earning-call-transcript",
    label: "Earning Call Transcript",
    path: "/stable/earning-call-transcript",
    queryFields: [SYMBOL_FIELD, YEAR_FIELD, QUARTER_FIELD],
    starterAvailability: "restricted",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "macro",
    description: "US Treasury-curve snapshot.",
    docsUrl: STABLE_DOCS_URL,
    id: "treasury-rates",
    label: "Treasury Rates",
    path: "/stable/treasury-rates",
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "macro",
    defaultParams: {
      name: "GDP",
    },
    description: "Historical economic-indicator series.",
    docsUrl: STABLE_DOCS_URL,
    id: "economic-indicators",
    label: "Economic Indicators",
    path: "/stable/economic-indicators",
    queryFields: [NAME_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "macro",
    defaultParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    description: "Upcoming economic-event calendar.",
    docsUrl: STABLE_DOCS_URL,
    id: "economic-calendar",
    label: "Economic Calendar",
    path: "/stable/economic-calendar",
    probeParams: (clock) => ({
      from: clock.today,
      to: clock.plusDays(30),
    }),
    queryFields: [FROM_FIELD, TO_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "macro",
    description: "Country-level equity risk premium table.",
    docsUrl: STABLE_DOCS_URL,
    id: "market-risk-premium",
    label: "Market Risk Premium",
    path: "/stable/market-risk-premium",
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "marketStructure",
    defaultParams: {
      exchange: "NASDAQ",
    },
    description: "Market-hours snapshot for a single exchange.",
    docsUrl: STABLE_DOCS_URL,
    id: "exchange-market-hours",
    label: "Exchange Market Hours",
    path: "/stable/exchange-market-hours",
    queryFields: [EXCHANGE_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HALF_HOUR_TTL_SECONDS,
  },
  {
    category: "marketStructure",
    description: "Market-hours snapshot for all exchanges.",
    docsUrl: STABLE_DOCS_URL,
    id: "all-exchange-market-hours",
    label: "All Exchange Market Hours",
    path: "/stable/all-exchange-market-hours",
    starterAvailability: "accessible",
    ttlSeconds: HALF_HOUR_TTL_SECONDS,
  },
  {
    category: "marketStructure",
    defaultParams: {
      exchange: "NASDAQ",
    },
    description: "Holiday schedule for a single exchange.",
    docsUrl: STABLE_DOCS_URL,
    id: "holidays-by-exchange",
    label: "Holidays By Exchange",
    path: "/stable/holidays-by-exchange",
    queryFields: [EXCHANGE_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: DAY_TTL_SECONDS,
  },
  {
    category: "breadth",
    defaultParams: (clock) => ({
      date: clock.today,
    }),
    description: "Sector PE snapshot by exchange and sector.",
    docsUrl: STABLE_DOCS_URL,
    id: "sector-pe-snapshot",
    label: "Sector PE Snapshot",
    path: "/stable/sector-pe-snapshot",
    probeParams: (clock) => ({
      date: clock.today,
    }),
    queryFields: [DATE_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "breadth",
    defaultParams: {
      sector: "Technology",
    },
    description: "Historical sector-performance series.",
    docsUrl: STABLE_DOCS_URL,
    id: "historical-sector-performance",
    label: "Historical Sector Performance",
    path: "/stable/historical-sector-performance",
    queryFields: [SECTOR_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: HOUR_TTL_SECONDS,
  },
  {
    category: "filings",
    defaultParams: {
      limit: 10,
      page: 0,
      symbol: "AAPL",
    },
    description: "Symbol-scoped insider trading feed.",
    docsUrl: STABLE_DOCS_URL,
    id: "insider-trading",
    label: "Insider Trading",
    path: "/stable/insider-trading",
    queryFields: [SYMBOL_FIELD, PAGE_FIELD, LIMIT_FIELD],
    starterAvailability: "restricted",
    ttlSeconds: THREE_MINUTES_TTL_SECONDS,
  },
  {
    category: "filings",
    defaultParams: {
      limit: 10,
      page: 0,
    },
    description: "Latest insider trading feed across symbols.",
    docsUrl: STABLE_DOCS_URL,
    id: "insider-trading-latest",
    label: "Insider Trading Latest",
    path: "/stable/insider-trading/latest",
    queryFields: [PAGE_FIELD, LIMIT_FIELD],
    starterAvailability: "accessible",
    ttlSeconds: THREE_MINUTES_TTL_SECONDS,
  },
] as const

export function getStarterDatasetDefinitions(
  clock: MarketDateClock = createMarketDateClock()
): StarterDatasetDefinition[] {
  return DATASET_DEFINITIONS.map((definition) => {
    const queryFieldDefaults = resolveQueryFieldDefaults(definition.queryFields)
    const defaultParams = {
      ...queryFieldDefaults,
      ...resolveQuery(definition.defaultParams, clock),
    }
    const probeParams = resolveQuery(
      definition.probeParams ?? definition.defaultParams,
      clock
    )

    return {
      ...definition,
      defaultParams,
      probeParams: {
        ...defaultParams,
        ...probeParams,
      },
    }
  })
}

export function getStarterDatasetDefinitionMap(
  clock: MarketDateClock = createMarketDateClock()
): Map<StarterDatasetId, StarterDatasetDefinition> {
  return new Map(
    getStarterDatasetDefinitions(clock).map((definition) => [
      definition.id,
      definition,
    ])
  )
}

export function deriveStarterIntradayIntervalsFromDatasetIds(
  datasetIds: Iterable<StarterDatasetId>
): FmpIntradayInterval[] {
  const datasetIdSet = new Set(datasetIds)
  const entries: [StarterDatasetId, FmpIntradayInterval][] = [
    ["historical-chart-1min", "1min"],
    ["historical-chart-5min", "5min"],
    ["historical-chart-15min", "15min"],
    ["historical-chart-30min", "30min"],
    ["historical-chart-1hour", "1hour"],
    ["historical-chart-4hour", "4hour"],
  ]

  return entries
    .filter(([datasetId]) => datasetIdSet.has(datasetId))
    .map(([, interval]) => interval)
}

export function deriveStarterCapabilitiesFromDatasetIds(
  datasetIds: Iterable<StarterDatasetId>
): Partial<Record<FmpCapabilityKey, boolean>> {
  const datasetIdSet = new Set(datasetIds)
  const intradayIntervals = deriveStarterIntradayIntervalsFromDatasetIds(
    datasetIdSet
  )

  return {
    analystInsights:
      datasetIdSet.has("price-target-consensus") &&
      datasetIdSet.has("grades-consensus") &&
      datasetIdSet.has("analyst-estimates"),
    batchIndexQuotes: datasetIdSet.has("batch-index-quotes"),
    batchQuotes: datasetIdSet.has("batch-quote"),
    commodityMarkets:
      datasetIdSet.has("commodity-quote") &&
      datasetIdSet.has("commodity-historical-chart-5min"),
    companyExecutives: datasetIdSet.has("key-executives"),
    cryptoMarkets:
      datasetIdSet.has("crypto-quote") &&
      datasetIdSet.has("crypto-historical-chart-5min"),
    dcf: datasetIdSet.has("levered-discounted-cash-flow"),
    earningsTranscripts: datasetIdSet.has("earning-call-transcript"),
    economics:
      datasetIdSet.has("earnings-calendar") &&
      datasetIdSet.has("economic-calendar") &&
      datasetIdSet.has("exchange-market-hours"),
    esgRatings: datasetIdSet.has("esg-ratings"),
    etfAssetExposure: datasetIdSet.has("etf-asset-exposure"),
    forexMarkets:
      datasetIdSet.has("forex-quote") &&
      datasetIdSet.has("forex-historical-chart-5min"),
    globalCoverage: false,
    insiderTrades: datasetIdSet.has("insider-trading"),
    intradayCharts: intradayIntervals.length > 0,
    latestInsiderFeed: datasetIdSet.has("insider-trading-latest"),
    ownership: datasetIdSet.has("institutional-ownership"),
    pressReleases: datasetIdSet.has("news-press-releases"),
    realtimeQuotes: datasetIdSet.has("quote"),
    secFilings: datasetIdSet.has("sec-filings-search-symbol"),
    shareFloatLiquidity: datasetIdSet.has("shares-float"),
    technicalIndicators: datasetIdSet.has("technical-indicators-rsi"),
  }
}
