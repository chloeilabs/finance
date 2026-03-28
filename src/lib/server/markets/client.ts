import "server-only"

import type {
  AnalystSummary,
  CalendarEvent,
  CompanyProfile,
  EtfExposureEntry,
  FilingEntry,
  InsiderTradeEntry,
  MacroRate,
  MarketMoverBucket,
  MarketSearchResult,
  MetricStat,
  NewsStory,
  OwnershipEntry,
  PricePoint,
  QuoteSnapshot,
  SectorSnapshot,
  StatementTable,
  SymbolDirectoryEntry,
  ValuationSnapshot,
} from "@/lib/shared"

import { getConfiguredFmpApiKey, getFmpBaseUrl, getFmpPlanTier } from "./config"
import { recordMarketApiUsage } from "./store"

const FMP_PROVIDER_NAME = "fmp"

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null
  }

  return value as Record<string, unknown>
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null
  }

  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

function asBoolean(value: unknown): boolean {
  return value === true
}

function toUrlSearchParams(
  params: Record<string, string | number | boolean | undefined>
) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue
    }

    searchParams.set(key, String(value))
  }

  return searchParams
}

function pickString(
  record: Record<string, unknown>,
  keys: string[]
): string | null {
  for (const key of keys) {
    const value = asString(record[key])
    if (value) {
      return value
    }
  }

  return null
}

function pickNumber(
  record: Record<string, unknown>,
  keys: string[]
): number | null {
  for (const key of keys) {
    const value = asNumber(record[key])
    if (value !== null) {
      return value
    }
  }

  return null
}

export class FmpRequestError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "FmpRequestError"
    this.status = status
  }
}

async function fetchFmpJson(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {}
): Promise<unknown> {
  const apiKey = getConfiguredFmpApiKey()

  if (!apiKey) {
    throw new FmpRequestError("FMP is not configured.", 503)
  }

  const query = toUrlSearchParams({
    ...params,
    apikey: apiKey,
  })
  const url = `${getFmpBaseUrl()}${path}?${query.toString()}`
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new FmpRequestError(
      `FMP request failed for ${path} with status ${String(response.status)}.`,
      response.status
    )
  }

  await recordMarketApiUsage(FMP_PROVIDER_NAME)
  return response.json()
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
  }
}

function mapSymbolDirectoryEntry(
  item: unknown,
  flags: { isActivelyTrading?: boolean; isEtf?: boolean } = {}
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

function mapQuote(item: unknown): QuoteSnapshot | null {
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
    name: pickString(record, ["name"]) ?? symbol,
    price: pickNumber(record, ["price"]),
    change: pickNumber(record, ["change"]),
    changesPercentage: pickNumber(record, [
      "changesPercentage",
      "changesPercentage1D",
    ]),
    open: pickNumber(record, ["open"]),
    dayLow: pickNumber(record, ["dayLow", "low"]),
    dayHigh: pickNumber(record, ["dayHigh", "high"]),
    yearLow: pickNumber(record, ["yearLow"]),
    yearHigh: pickNumber(record, ["yearHigh"]),
    volume: pickNumber(record, ["volume"]),
    avgVolume: pickNumber(record, ["avgVolume"]),
    marketCap: pickNumber(record, ["marketCap"]),
    priceAvg50: pickNumber(record, ["priceAvg50"]),
    priceAvg200: pickNumber(record, ["priceAvg200"]),
    exchange: pickString(record, ["exchange", "exchangeShortName"]),
    currency: pickString(record, ["currency"]),
    timestamp: pickString(record, ["timestamp", "date"]),
  }
}

function mapPricePoint(item: unknown): PricePoint | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const date = pickString(record, ["date"])

  if (!date) {
    return null
  }

  return {
    date,
    open: pickNumber(record, ["open"]),
    high: pickNumber(record, ["high"]),
    low: pickNumber(record, ["low"]),
    close: pickNumber(record, ["close", "price"]),
    volume: pickNumber(record, ["volume"]),
  }
}

function mapProfile(item: unknown): CompanyProfile | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const symbol = pickString(record, ["symbol"])
  const companyName = pickString(record, ["companyName", "name"])

  if (!symbol || !companyName) {
    return null
  }

  return {
    symbol,
    companyName,
    exchangeShortName: pickString(record, ["exchangeShortName", "exchange"]),
    sector: pickString(record, ["sector"]),
    industry: pickString(record, ["industry"]),
    website: pickString(record, ["website"]),
    description: pickString(record, ["description"]),
    ceo: pickString(record, ["ceo"]),
    country: pickString(record, ["country"]),
    city: pickString(record, ["city"]),
    state: pickString(record, ["state"]),
    employees: pickNumber(record, ["fullTimeEmployees", "employees"]),
    ipoDate: pickString(record, ["ipoDate"]),
    beta: pickNumber(record, ["beta"]),
    marketCap: pickNumber(record, ["mktCap", "marketCap"]),
    image: pickString(record, ["image"]),
  }
}

function mapMetricStats(
  item: unknown,
  labels: { key: string; label: string }[]
): MetricStat[] {
  const record = asRecord(item)

  if (!record) {
    return []
  }

  return labels.map(({ key, label }) => ({
    label,
    value: asNumber(record[key]) ?? asString(record[key]) ?? null,
  }))
}

function buildStatementTable(params: {
  title: string
  items: unknown[]
  rowKeys: { key: string; label: string }[]
}): StatementTable | null {
  const rows = params.items
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null)
    .slice(0, 4)

  if (rows.length === 0) {
    return null
  }

  return {
    title: params.title,
    columns: rows.map(
      (row) => pickString(row, ["date", "calendarYear"]) ?? "N/A"
    ),
    rows: params.rowKeys.map(({ key, label }) => ({
      label,
      values: rows.map(
        (row) => asNumber(row[key]) ?? asString(row[key]) ?? null
      ),
    })),
  }
}

function mapCalendarEvent(
  item: unknown,
  eventType: CalendarEvent["eventType"]
): CalendarEvent | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const eventDate = pickString(record, ["date", "fillingDate"])
  const symbol = pickString(record, ["symbol"])

  if (!eventDate) {
    return null
  }

  return {
    symbol: symbol ?? "N/A",
    name: pickString(record, ["name", "companyName"]) ?? symbol ?? "Unknown",
    eventType,
    eventDate,
    time: pickString(record, ["time"]),
    value:
      pickString(record, ["dividend", "adjDividend", "splitRatio"]) ??
      pickNumber(record, ["dividend", "adjDividend"])?.toString() ??
      null,
    estimate:
      pickString(record, ["epsEstimated", "eps"]) ??
      pickNumber(record, ["epsEstimated", "eps"])?.toString() ??
      null,
  }
}

function mapNewsStory(item: unknown): NewsStory | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const url = pickString(record, ["url", "link"])
  const title = pickString(record, ["title"])

  if (!url || !title) {
    return null
  }

  return {
    id: url,
    symbol: pickString(record, ["symbol", "ticker"]),
    title,
    text: pickString(record, ["text", "content"]),
    url,
    site: pickString(record, ["site", "publisher"]),
    image: pickString(record, ["image"]),
    publishedAt: pickString(record, ["publishedDate", "date"]),
  }
}

function mapMacroRate(item: unknown): MacroRate | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const label = pickString(record, ["name", "maturity", "event"])

  if (!label) {
    return null
  }

  return {
    label,
    value: pickNumber(record, ["value", "rate", "actual"]),
    previous: pickNumber(record, ["previous"]),
    date: pickString(record, ["date"]),
  }
}

function mapAnalystSummary(
  item: unknown,
  grades: unknown[]
): AnalystSummary | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    targetLow: pickNumber(record, ["targetLow", "low"]),
    targetHigh: pickNumber(record, ["targetHigh", "high"]),
    targetConsensus: pickNumber(record, [
      "targetConsensus",
      "targetMean",
      "consensus",
    ]),
    ratingSummary: pickString(record, ["consensusRating", "recommendation"]),
    grades: grades
      .map((grade) => asRecord(grade))
      .filter((grade): grade is Record<string, unknown> => grade !== null)
      .slice(0, 6)
      .map((grade) => ({
        date: pickString(grade, ["date", "gradingCompanyDate"]),
        provider: pickString(grade, ["gradingCompany", "provider"]),
        grade: pickString(grade, ["newGrade", "grade"]),
      })),
  }
}

function mapFiling(item: unknown): FilingEntry | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    formType: pickString(record, ["formType"]),
    filingDate: pickString(record, ["fillingDate", "filingDate"]),
    acceptedDate: pickString(record, ["acceptedDate"]),
    description: pickString(record, ["description", "linkText"]),
    finalLink: pickString(record, ["finalLink", "link"]),
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

function dedupeSymbols(symbols: string[]): string[] {
  return [
    ...new Set(
      symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean)
    ),
  ]
}

export function createFmpClient() {
  return {
    directory: {
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
          .map((item) =>
            mapSymbolDirectoryEntry(item, { isActivelyTrading: true })
          )
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
          .map((item) => (typeof item === "string" ? item.trim() : null))
          .filter((item): item is string => Boolean(item))
      },
      async listSectors(): Promise<string[]> {
        const payload = await fetchFmpJson("/stable/available-sectors")

        return asArray(payload)
          .map((item) => (typeof item === "string" ? item.trim() : null))
          .filter((item): item is string => Boolean(item))
      },
      async screenCompanies(
        params: Record<string, string | number | boolean | undefined>
      ) {
        const payload = await fetchFmpJson("/stable/company-screener", params)

        return asArray(payload)
          .map(mapSearchResult)
          .filter((item): item is MarketSearchResult => item !== null)
      },
    },
    quotes: {
      async getQuote(symbol: string): Promise<QuoteSnapshot | null> {
        const payload = await fetchFmpJson("/stable/quote", { symbol })
        return mapQuote(asArray(payload)[0])
      },
      async getBatchQuotes(symbols: string[]): Promise<QuoteSnapshot[]> {
        const normalizedSymbols = dedupeSymbols(symbols)

        if (normalizedSymbols.length === 0) {
          return []
        }

        const payload = await fetchFmpJson("/stable/batch-quote", {
          symbols: normalizedSymbols.join(","),
        })

        return asArray(payload)
          .map(mapQuote)
          .filter((item): item is QuoteSnapshot => item !== null)
      },
      async getIndexQuotes(): Promise<QuoteSnapshot[]> {
        const payload = await fetchFmpJson("/stable/batch-index-quotes")
        const wanted = new Set(["^GSPC", "^IXIC", "^DJI", "^RUT"])

        return asArray(payload)
          .map(mapQuote)
          .filter(
            (item): item is QuoteSnapshot =>
              item !== null && wanted.has(item.symbol)
          )
      },
      async getMovers(): Promise<MarketMoverBucket[]> {
        const [gainers, losers, actives] = await Promise.all([
          fetchFmpJson("/stable/biggest-gainers"),
          fetchFmpJson("/stable/biggest-losers"),
          fetchFmpJson("/stable/most-actives"),
        ])

        return [
          {
            label: "Leaders",
            items: asArray(gainers)
              .map(mapQuote)
              .filter((item): item is QuoteSnapshot => item !== null)
              .slice(0, 6),
          },
          {
            label: "Laggards",
            items: asArray(losers)
              .map(mapQuote)
              .filter((item): item is QuoteSnapshot => item !== null)
              .slice(0, 6),
          },
          {
            label: "Most Active",
            items: asArray(actives)
              .map(mapQuote)
              .filter((item): item is QuoteSnapshot => item !== null)
              .slice(0, 6),
          },
        ]
      },
      async getSectorPerformance(date?: string): Promise<SectorSnapshot[]> {
        const payload = await fetchFmpJson(
          "/stable/sector-performance-snapshot",
          {
            date,
          }
        )

        return asArray(payload)
          .map((item) => {
            const record = asRecord(item)
            if (!record) {
              return null
            }

            const sector = pickString(record, ["sector"])
            if (!sector) {
              return null
            }

            return {
              sector,
              changePercentage: pickNumber(record, [
                "changesPercentage",
                "changePercentage",
              ]),
            }
          })
          .filter((item): item is SectorSnapshot => item !== null)
      },
    },
    charts: {
      async getEodChart(symbol: string): Promise<PricePoint[]> {
        const payload = await fetchFmpJson(
          "/stable/historical-price-eod/light",
          {
            symbol,
          }
        )

        return asArray(payload)
          .map(mapPricePoint)
          .filter((item): item is PricePoint => item !== null)
          .slice(0, 180)
          .reverse()
      },
      async getIntradayChart(
        symbol: string,
        interval: "1min" | "5min" | "15min" | "1hour"
      ) {
        const payload = await fetchFmpJson(
          `/stable/historical-chart/${interval}`,
          {
            symbol,
          }
        )

        return asArray(payload)
          .map(mapPricePoint)
          .filter((item): item is PricePoint => item !== null)
          .slice(0, 120)
          .reverse()
      },
    },
    company: {
      async getProfile(symbol: string): Promise<CompanyProfile | null> {
        const payload = await fetchFmpJson("/stable/profile", { symbol })
        return mapProfile(asArray(payload)[0])
      },
      async getPeers(symbol: string): Promise<string[]> {
        const payload = await fetchFmpJson("/stable/stock-peers", { symbol })
        return asArray(payload)
          .flatMap((item) => {
            const record = asRecord(item)
            return record ? asArray(record.peersList) : []
          })
          .map((item) => asString(item))
          .filter((item): item is string => Boolean(item))
      },
    },
    fundamentals: {
      async getKeyMetricsTtm(symbol: string): Promise<MetricStat[]> {
        const payload = await fetchFmpJson("/stable/key-metrics-ttm", {
          symbol,
        })

        return mapMetricStats(asArray(payload)[0], [
          { key: "freeCashFlowYieldTTM", label: "FCF Yield" },
          { key: "roicTTM", label: "ROIC" },
          { key: "returnOnEquityTTM", label: "ROE" },
          { key: "currentRatioTTM", label: "Current Ratio" },
          { key: "enterpriseValueOverEBITDATTM", label: "EV / EBITDA" },
        ])
      },
      async getRatiosTtm(symbol: string): Promise<MetricStat[]> {
        const payload = await fetchFmpJson("/stable/ratios-ttm", { symbol })

        return mapMetricStats(asArray(payload)[0], [
          { key: "grossProfitMarginTTM", label: "Gross Margin" },
          { key: "operatingProfitMarginTTM", label: "Operating Margin" },
          { key: "netProfitMarginTTM", label: "Net Margin" },
          { key: "priceToEarningsRatioTTM", label: "P / E" },
          { key: "priceToBookRatioTTM", label: "P / B" },
        ])
      },
      async getIncomeStatement(symbol: string): Promise<StatementTable | null> {
        const payload = await fetchFmpJson("/stable/income-statement", {
          symbol,
        })

        return buildStatementTable({
          title: "Income Statement",
          items: asArray(payload),
          rowKeys: [
            { key: "revenue", label: "Revenue" },
            { key: "grossProfit", label: "Gross Profit" },
            { key: "operatingIncome", label: "Operating Income" },
            { key: "netIncome", label: "Net Income" },
            { key: "eps", label: "EPS" },
          ],
        })
      },
      async getBalanceSheet(symbol: string): Promise<StatementTable | null> {
        const payload = await fetchFmpJson("/stable/balance-sheet-statement", {
          symbol,
        })

        return buildStatementTable({
          title: "Balance Sheet",
          items: asArray(payload),
          rowKeys: [
            { key: "cashAndCashEquivalents", label: "Cash" },
            { key: "totalAssets", label: "Assets" },
            { key: "totalLiabilities", label: "Liabilities" },
            { key: "totalDebt", label: "Debt" },
            { key: "totalStockholdersEquity", label: "Equity" },
          ],
        })
      },
      async getCashFlow(symbol: string): Promise<StatementTable | null> {
        const payload = await fetchFmpJson("/stable/cash-flow-statement", {
          symbol,
        })

        return buildStatementTable({
          title: "Cash Flow",
          items: asArray(payload),
          rowKeys: [
            { key: "operatingCashFlow", label: "Operating Cash Flow" },
            { key: "capitalExpenditure", label: "Capex" },
            { key: "freeCashFlow", label: "Free Cash Flow" },
            {
              key: "netCashUsedForInvestingActivites",
              label: "Investing Cash Flow",
            },
            {
              key: "netCashUsedProvidedByFinancingActivities",
              label: "Financing Cash Flow",
            },
          ],
        })
      },
      async getGrowth(symbol: string): Promise<MetricStat[]> {
        const payload = await fetchFmpJson("/stable/income-statement-growth", {
          symbol,
        })

        return mapMetricStats(asArray(payload)[0], [
          { key: "growthRevenue", label: "Revenue Growth" },
          { key: "growthGrossProfit", label: "Gross Profit Growth" },
          { key: "growthOperatingIncome", label: "Operating Income Growth" },
          { key: "growthNetIncome", label: "Net Income Growth" },
          { key: "growthEPS", label: "EPS Growth" },
        ])
      },
      async getRatingsSnapshot(symbol: string): Promise<MetricStat[]> {
        const payload = await fetchFmpJson("/stable/ratings-snapshot", {
          symbol,
        })

        return mapMetricStats(asArray(payload)[0], [
          { key: "rating", label: "Rating" },
          { key: "ratingRecommendation", label: "Recommendation" },
          { key: "ratingReturnOnEquityScore", label: "ROE Score" },
          { key: "ratingDebtToEquityScore", label: "Debt / Equity Score" },
          { key: "ratingPeScore", label: "P / E Score" },
        ])
      },
      async getEnterpriseValue(symbol: string): Promise<unknown> {
        const payload = await fetchFmpJson("/stable/enterprise-values", {
          symbol,
        })
        return asArray(payload)[0] ?? null
      },
      async getOwnerEarnings(symbol: string): Promise<unknown> {
        const payload = await fetchFmpJson("/stable/owner-earnings", { symbol })
        return asArray(payload)[0] ?? null
      },
    },
    calendar: {
      async getEarningsCalendar(
        from?: string,
        to?: string
      ): Promise<CalendarEvent[]> {
        const payload = await fetchFmpJson("/stable/earnings-calendar", {
          from,
          to,
        })

        return asArray(payload)
          .map((item) => mapCalendarEvent(item, "earnings"))
          .filter((item): item is CalendarEvent => item !== null)
      },
      async getDividendsCalendar(
        from?: string,
        to?: string
      ): Promise<CalendarEvent[]> {
        const payload = await fetchFmpJson("/stable/dividends-calendar", {
          from,
          to,
        })

        return asArray(payload)
          .map((item) => mapCalendarEvent(item, "dividend"))
          .filter((item): item is CalendarEvent => item !== null)
      },
      async getEarnings(symbol: string): Promise<CalendarEvent[]> {
        const payload = await fetchFmpJson("/stable/earnings", { symbol })

        return asArray(payload)
          .map((item) => mapCalendarEvent(item, "earnings"))
          .filter((item): item is CalendarEvent => item !== null)
      },
      async getDividends(symbol: string): Promise<CalendarEvent[]> {
        const payload = await fetchFmpJson("/stable/dividends", { symbol })

        return asArray(payload)
          .map((item) => mapCalendarEvent(item, "dividend"))
          .filter((item): item is CalendarEvent => item !== null)
      },
      async getSplits(symbol: string): Promise<CalendarEvent[]> {
        const payload = await fetchFmpJson("/stable/splits", { symbol })

        return asArray(payload)
          .map((item) => mapCalendarEvent(item, "split"))
          .filter((item): item is CalendarEvent => item !== null)
      },
    },
    news: {
      async getLatestStockNews(limit = 12): Promise<NewsStory[]> {
        const payload = await fetchFmpJson("/stable/news/stock-latest", {
          page: 0,
          limit,
        })

        return asArray(payload)
          .map(mapNewsStory)
          .filter((item): item is NewsStory => item !== null)
      },
      async getStockNews(symbol: string, limit = 12): Promise<NewsStory[]> {
        const payload = await fetchFmpJson("/stable/news/stock", {
          symbols: symbol,
          page: 0,
          limit,
        })

        return asArray(payload)
          .map(mapNewsStory)
          .filter((item): item is NewsStory => item !== null)
      },
      async getPressReleases(symbol: string, limit = 6): Promise<NewsStory[]> {
        const payload = await fetchFmpJson("/stable/news/press-releases", {
          symbols: symbol,
          page: 0,
          limit,
        })

        return asArray(payload)
          .map(mapNewsStory)
          .filter((item): item is NewsStory => item !== null)
      },
    },
    analyst: {
      async getSummary(symbol: string): Promise<AnalystSummary | null> {
        const [consensus, grades] = await Promise.all([
          fetchFmpJson("/stable/price-target-consensus", { symbol }),
          fetchFmpJson("/stable/grades", { symbol }),
        ])

        return mapAnalystSummary(asArray(consensus)[0], asArray(grades))
      },
    },
    filings: {
      async getSecFilings(
        symbol: string,
        from: string,
        to: string
      ): Promise<FilingEntry[]> {
        const payload = await fetchFmpJson(
          "/stable/sec-filings-search/symbol",
          {
            symbol,
            from,
            to,
            page: 0,
            limit: 10,
          }
        )

        return asArray(payload)
          .map(mapFiling)
          .filter((item): item is FilingEntry => item !== null)
      },
    },
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
    macro: {
      async getTreasuryRates(): Promise<MacroRate[]> {
        const payload = await fetchFmpJson("/stable/treasury-rates")

        return asArray(payload)
          .map(mapMacroRate)
          .filter((item): item is MacroRate => item !== null)
          .slice(0, 8)
      },
      async getEconomicCalendar(): Promise<CalendarEvent[]> {
        const payload = await fetchFmpJson("/stable/economic-calendar")

        return asArray(payload)
          .map((item) => mapCalendarEvent(item, "economic"))
          .filter((item): item is CalendarEvent => item !== null)
          .slice(0, 8)
      },
      async getEconomicIndicators(names: string[]): Promise<MacroRate[]> {
        const entries = await Promise.all(
          names.map((name) =>
            fetchFmpJson("/stable/economic-indicators", { name }).catch(
              () => []
            )
          )
        )

        return entries
          .flatMap((payload) => asArray(payload).slice(0, 1))
          .map(mapMacroRate)
          .filter((item): item is MacroRate => item !== null)
      },
    },
    valuation: {
      async getSnapshot(symbol: string): Promise<ValuationSnapshot | null> {
        const path =
          getFmpPlanTier() === "BASIC"
            ? "/stable/enterprise-values"
            : "/stable/levered-discounted-cash-flow"
        const [valuation, ownerEarnings] = await Promise.all([
          fetchFmpJson(path, { symbol }).catch(() => []),
          fetchFmpJson("/stable/owner-earnings", { symbol }).catch(() => []),
        ])

        return mapValuation(asArray(valuation)[0], asArray(ownerEarnings)[0])
      },
    },
  }
}
