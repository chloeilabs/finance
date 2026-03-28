import "server-only"

import type {
  AftermarketSnapshot,
  AnalystEstimateSnapshot,
  AnalystSummary,
  CalendarEvent,
  CompanyProfile,
  EmployeeCountPoint,
  EtfExposureEntry,
  FilingEntry,
  FinancialScoreSnapshot,
  FmpIntradayInterval,
  GradesConsensus,
  InsiderTradeEntry,
  MacroRate,
  MarketCapPoint,
  MarketHoliday,
  MarketHoursSnapshot,
  MarketMoverBucket,
  MarketSearchResult,
  MetricStat,
  NewsStory,
  OwnershipEntry,
  PriceChangeSnapshot,
  PricePoint,
  QuoteSnapshot,
  RatingsHistoricalEntry,
  RevenueSegmentation,
  RiskPremiumSnapshot,
  SecProfile,
  SectorHistoryPoint,
  SectorSnapshot,
  SectorValuationSnapshot,
  StatementTable,
  SymbolDirectoryEntry,
  TechnicalIndicatorSeries,
  ValuationSnapshot,
} from "@/lib/shared"

import { getConfiguredFmpApiKey, getFmpBaseUrl } from "./config"
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

  await recordMarketApiUsage(FMP_PROVIDER_NAME)

  if (!response.ok) {
    throw new FmpRequestError(
      `FMP request failed for ${path} with status ${String(response.status)}.`,
      response.status
    )
  }

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
    price: pickNumber(record, ["price"]),
    marketCap: pickNumber(record, ["marketCap", "mktCap"]),
    volume: pickNumber(record, ["volume"]),
    beta: pickNumber(record, ["beta"]),
    dividend: pickNumber(record, ["lastAnnualDividend", "dividend"]),
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
      "changePercentage",
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
    symbol: symbol ?? pickString(record, ["country", "currency"]) ?? "N/A",
    name:
      pickString(record, ["name", "companyName", "event"]) ??
      symbol ??
      "Unknown",
    eventType,
    eventDate,
    time: pickString(record, ["time"]),
    value:
      pickString(record, [
        "dividend",
        "adjDividend",
        "splitRatio",
        "actual",
        "previous",
      ]) ??
      pickNumber(record, ["dividend", "adjDividend", "actual", "previous"])?.toString() ??
      null,
    estimate:
      pickString(record, ["epsEstimated", "eps", "estimate"]) ??
      pickNumber(record, ["epsEstimated", "eps", "estimate"])?.toString() ??
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

function mapAftermarketSnapshot(
  tradeItem: unknown,
  quoteItem: unknown
): AftermarketSnapshot | null {
  const trade = asRecord(tradeItem)
  const quote = asRecord(quoteItem)

  if (!trade && !quote) {
    return null
  }

  return {
    lastTradePrice: trade ? pickNumber(trade, ["price"]) : null,
    lastTradeTimestamp: trade
      ? pickString(trade, ["timestamp", "date"])
      : null,
    bidPrice: quote ? pickNumber(quote, ["bidPrice"]) : null,
    askPrice: quote ? pickNumber(quote, ["askPrice"]) : null,
    volume: quote ? pickNumber(quote, ["volume"]) : null,
    quoteTimestamp: quote ? pickString(quote, ["timestamp", "date"]) : null,
  }
}

function mapPriceChange(item: unknown): PriceChangeSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    day1: pickNumber(record, ["1D"]),
    day5: pickNumber(record, ["5D"]),
    month1: pickNumber(record, ["1M"]),
    month3: pickNumber(record, ["3M"]),
    month6: pickNumber(record, ["6M"]),
    ytd: pickNumber(record, ["ytd", "YTD"]),
    year1: pickNumber(record, ["1Y"]),
    year3: pickNumber(record, ["3Y"]),
    year5: pickNumber(record, ["5Y"]),
    year10: pickNumber(record, ["10Y"]),
    max: pickNumber(record, ["max"]),
  }
}

function mapTechnicalSeries(
  items: unknown[],
  params: {
    id: string
    label: string
    field: string
  }
): TechnicalIndicatorSeries {
  return {
    id: params.id,
    label: params.label,
    points: items
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null)
      .map((record) => ({
        date: pickString(record, ["date"]) ?? "",
        value: pickNumber(record, [params.field]),
      }))
      .filter((point) => point.date !== "")
      .reverse(),
  }
}

function mapFinancialScores(item: unknown): FinancialScoreSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    altmanZScore: pickNumber(record, ["altmanZScore"]),
    piotroskiScore: pickNumber(record, ["piotroskiScore"]),
    workingCapital: pickNumber(record, ["workingCapital"]),
    totalAssets: pickNumber(record, ["totalAssets"]),
    retainedEarnings: pickNumber(record, ["retainedEarnings"]),
    ebit: pickNumber(record, ["ebit"]),
    marketCap: pickNumber(record, ["marketCap"]),
    totalLiabilities: pickNumber(record, ["totalLiabilities"]),
    revenue: pickNumber(record, ["revenue"]),
  }
}

function mapAnalystEstimate(item: unknown): AnalystEstimateSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    date: pickString(record, ["date"]),
    revenueLow: pickNumber(record, ["revenueLow"]),
    revenueHigh: pickNumber(record, ["revenueHigh"]),
    revenueAvg: pickNumber(record, ["revenueAvg"]),
    ebitdaLow: pickNumber(record, ["ebitdaLow"]),
    ebitdaHigh: pickNumber(record, ["ebitdaHigh"]),
    ebitdaAvg: pickNumber(record, ["ebitdaAvg"]),
    epsLow: pickNumber(record, ["epsLow"]),
    epsHigh: pickNumber(record, ["epsHigh"]),
    epsAvg: pickNumber(record, ["epsAvg"]),
    numberAnalystsRevenue: pickNumber(record, ["numberAnalystsRevenue"]),
    numberAnalystsEps: pickNumber(record, ["numberAnalystsEps"]),
  }
}

function mapGradesConsensus(item: unknown): GradesConsensus | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    strongBuy: pickNumber(record, ["strongBuy"]),
    buy: pickNumber(record, ["buy"]),
    hold: pickNumber(record, ["hold"]),
    sell: pickNumber(record, ["sell"]),
    strongSell: pickNumber(record, ["strongSell"]),
    consensus: pickString(record, ["consensus"]),
  }
}

function mapRatingsHistoricalEntry(item: unknown): RatingsHistoricalEntry | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    date: pickString(record, ["date"]),
    rating: pickString(record, ["rating"]),
    overallScore: pickNumber(record, ["overallScore"]),
    discountedCashFlowScore: pickNumber(record, ["discountedCashFlowScore"]),
    returnOnEquityScore: pickNumber(record, ["returnOnEquityScore"]),
    returnOnAssetsScore: pickNumber(record, ["returnOnAssetsScore"]),
    debtToEquityScore: pickNumber(record, ["debtToEquityScore"]),
    peScore: pickNumber(record, ["peScore"]),
    pbScore: pickNumber(record, ["pbScore"]),
  }
}

function mapRevenueSegmentation(item: unknown): RevenueSegmentation | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const segmentsRecord = asRecord(record.data)

  if (!segmentsRecord) {
    return null
  }

  return {
    date: pickString(record, ["date"]),
    fiscalYear: pickNumber(record, ["fiscalYear"]),
    period: pickString(record, ["period"]),
    segments: Object.entries(segmentsRecord)
      .map(([label, value]) => ({
        label,
        value: asNumber(value),
      }))
      .sort((left, right) => (right.value ?? 0) - (left.value ?? 0)),
  }
}

function mapMarketCapPoint(item: unknown): MarketCapPoint | null {
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
    marketCap: pickNumber(record, ["marketCap"]),
  }
}

function mapEmployeeCountPoint(item: unknown): EmployeeCountPoint | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    acceptanceTime: pickString(record, ["acceptanceTime"]),
    periodOfReport: pickString(record, ["periodOfReport", "date"]),
    employeeCount: pickNumber(record, ["employeeCount", "employees"]),
  }
}

function mapSecProfile(item: unknown): SecProfile | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  return {
    cik: pickString(record, ["cik"]),
    registrantName: pickString(record, ["registrantName"]),
    sicCode: pickString(record, ["sicCode"]),
    sicDescription: pickString(record, ["sicDescription"]),
    sicGroup: pickString(record, ["sicGroup"]),
  }
}

function mapMarketHours(item: unknown): MarketHoursSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const exchange = pickString(record, ["exchange"])

  if (!exchange) {
    return null
  }

  return {
    exchange,
    name: pickString(record, ["name"]),
    openingHour: pickString(record, ["openingHour"]),
    closingHour: pickString(record, ["closingHour"]),
    timezone: pickString(record, ["timezone"]),
    isMarketOpen: asBoolean(record.isMarketOpen),
  }
}

function mapMarketHoliday(item: unknown): MarketHoliday | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const exchange = pickString(record, ["exchange"])

  if (!exchange) {
    return null
  }

  return {
    exchange,
    date: pickString(record, ["date"]),
    name: pickString(record, ["name"]),
    isClosed: asBoolean(record.isClosed),
    adjOpenTime: pickString(record, ["adjOpenTime"]),
    adjCloseTime: pickString(record, ["adjCloseTime"]),
  }
}

function mapSectorValuation(item: unknown): SectorValuationSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const sector = pickString(record, ["sector"])

  if (!sector) {
    return null
  }

  return {
    date: pickString(record, ["date"]),
    sector,
    exchange: pickString(record, ["exchange"]),
    pe: pickNumber(record, ["pe"]),
  }
}

function mapSectorHistoryPoint(item: unknown): SectorHistoryPoint | null {
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
    averageChange: pickNumber(record, ["averageChange"]),
  }
}

function mapRiskPremium(item: unknown): RiskPremiumSnapshot | null {
  const record = asRecord(item)

  if (!record) {
    return null
  }

  const country = pickString(record, ["country"])

  if (!country) {
    return null
  }

  return {
    country,
    countryRiskPremium: pickNumber(record, ["countryRiskPremium"]),
    totalEquityRiskPremium: pickNumber(record, ["totalEquityRiskPremium"]),
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
          .map((item) => {
            const record = asRecord(item)
            return record ? pickString(record, ["exchange", "name"]) : asString(item)
          })
          .filter((item): item is string => Boolean(item))
      },
      async listSectors(): Promise<string[]> {
        const payload = await fetchFmpJson("/stable/available-sectors")

        return asArray(payload)
          .map((item) => {
            const record = asRecord(item)
            return record ? pickString(record, ["sector"]) : asString(item)
          })
          .filter((item): item is string => Boolean(item))
      },
      async listIndustries(): Promise<string[]> {
        const payload = await fetchFmpJson("/stable/available-industries")

        return asArray(payload)
          .map((item) => {
            const record = asRecord(item)
            return record ? pickString(record, ["industry"]) : asString(item)
          })
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
      async getAftermarketSnapshot(
        symbol: string
      ): Promise<AftermarketSnapshot | null> {
        const [trade, quote] = await Promise.all([
          fetchFmpJson("/stable/aftermarket-trade", { symbol }).catch(() => []),
          fetchFmpJson("/stable/aftermarket-quote", { symbol }).catch(() => []),
        ])

        return mapAftermarketSnapshot(asArray(trade)[0], asArray(quote)[0])
      },
      async getPriceChange(symbol: string): Promise<PriceChangeSnapshot | null> {
        const payload = await fetchFmpJson("/stable/stock-price-change", {
          symbol,
        })

        return mapPriceChange(asArray(payload)[0])
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
                "averageChange",
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
          .reverse()
      },
      async getIntradayChart(
        symbol: string,
        interval: FmpIntradayInterval
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
    technicals: {
      async getCoreIndicators(
        symbol: string
      ): Promise<TechnicalIndicatorSeries[]> {
        const [sma20, sma50, ema20, rsi14] = await Promise.all([
          fetchFmpJson("/stable/technical-indicators/sma", {
            symbol,
            periodLength: 20,
            timeframe: "1day",
          }).catch(() => []),
          fetchFmpJson("/stable/technical-indicators/sma", {
            symbol,
            periodLength: 50,
            timeframe: "1day",
          }).catch(() => []),
          fetchFmpJson("/stable/technical-indicators/ema", {
            symbol,
            periodLength: 20,
            timeframe: "1day",
          }).catch(() => []),
          fetchFmpJson("/stable/technical-indicators/rsi", {
            symbol,
            periodLength: 14,
            timeframe: "1day",
          }).catch(() => []),
        ])

        return [
          mapTechnicalSeries(asArray(sma20), {
            id: "sma20",
            label: "SMA 20",
            field: "sma",
          }),
          mapTechnicalSeries(asArray(sma50), {
            id: "sma50",
            label: "SMA 50",
            field: "sma",
          }),
          mapTechnicalSeries(asArray(ema20), {
            id: "ema20",
            label: "EMA 20",
            field: "ema",
          }),
          mapTechnicalSeries(asArray(rsi14), {
            id: "rsi14",
            label: "RSI 14",
            field: "rsi",
          }),
        ]
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
      async getMarketCapHistory(symbol: string): Promise<MarketCapPoint[]> {
        const payload = await fetchFmpJson(
          "/stable/historical-market-capitalization",
          {
            symbol,
            limit: 120,
          }
        )

        return asArray(payload)
          .map(mapMarketCapPoint)
          .filter((item): item is MarketCapPoint => item !== null)
          .reverse()
      },
      async getEmployeeHistory(symbol: string): Promise<EmployeeCountPoint[]> {
        const payload = await fetchFmpJson("/stable/historical-employee-count", {
          symbol,
        })

        return asArray(payload)
          .map(mapEmployeeCountPoint)
          .filter((item): item is EmployeeCountPoint => item !== null)
          .reverse()
      },
      async getLatestEmployeeCount(
        symbol: string
      ): Promise<EmployeeCountPoint | null> {
        const payload = await fetchFmpJson("/stable/employee-count", {
          symbol,
        })

        return mapEmployeeCountPoint(asArray(payload)[0])
      },
      async getProductSegmentation(
        symbol: string
      ): Promise<RevenueSegmentation | null> {
        const payload = await fetchFmpJson(
          "/stable/revenue-product-segmentation",
          {
            symbol,
          }
        )

        return mapRevenueSegmentation(asArray(payload)[0])
      },
      async getGeographicSegmentation(
        symbol: string
      ): Promise<RevenueSegmentation | null> {
        const payload = await fetchFmpJson(
          "/stable/revenue-geographic-segmentation",
          {
            symbol,
          }
        )

        return mapRevenueSegmentation(asArray(payload)[0])
      },
      async getSecProfile(symbol: string): Promise<SecProfile | null> {
        const payload = await fetchFmpJson("/stable/sec-profile", { symbol })
        return mapSecProfile(asArray(payload)[0])
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
      async getFinancialScores(
        symbol: string
      ): Promise<FinancialScoreSnapshot | null> {
        const payload = await fetchFmpJson("/stable/financial-scores", {
          symbol,
        })

        return mapFinancialScores(asArray(payload)[0])
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
      async getLatestGeneralNews(limit = 12): Promise<NewsStory[]> {
        const payload = await fetchFmpJson("/stable/news/general-latest", {
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
      async getGradesConsensus(symbol: string): Promise<GradesConsensus | null> {
        const payload = await fetchFmpJson("/stable/grades-consensus", {
          symbol,
        })

        return mapGradesConsensus(asArray(payload)[0])
      },
      async getAnalystEstimates(
        symbol: string
      ): Promise<AnalystEstimateSnapshot[]> {
        const payload = await fetchFmpJson("/stable/analyst-estimates", {
          symbol,
          period: "annual",
          page: 0,
          limit: 4,
        })

        return asArray(payload)
          .map(mapAnalystEstimate)
          .filter(
            (item): item is AnalystEstimateSnapshot => item !== null
          )
      },
      async getRatingsHistorical(
        symbol: string
      ): Promise<RatingsHistoricalEntry[]> {
        const payload = await fetchFmpJson("/stable/ratings-historical", {
          symbol,
        })

        return asArray(payload)
          .map(mapRatingsHistoricalEntry)
          .filter(
            (item): item is RatingsHistoricalEntry => item !== null
          )
          .slice(0, 8)
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
        const latest = asRecord(asArray(payload)[0])

        if (!latest) {
          return []
        }

        const labels = [
          ["month3", "3M Treasury"],
          ["year2", "2Y Treasury"],
          ["year10", "10Y Treasury"],
        ] as const

        return labels.map(([key, label]) => ({
          label,
          value: pickNumber(latest, [key]),
          previous: null,
          date: pickString(latest, ["date"]),
        }))
      },
      async getEconomicCalendar(
        from?: string,
        to?: string
      ): Promise<CalendarEvent[]> {
        const payload = await fetchFmpJson("/stable/economic-calendar", {
          from,
          to,
        })

        return asArray(payload)
          .map((item) => mapCalendarEvent(item, "economic"))
          .filter((item): item is CalendarEvent => item !== null)
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
      async getMarketRiskPremium(): Promise<RiskPremiumSnapshot | null> {
        const payload = await fetchFmpJson("/stable/market-risk-premium")

        return asArray(payload)
          .map(mapRiskPremium)
          .find((item) => item?.country === "United States") ?? null
      },
    },
    marketStructure: {
      async getExchangeMarketHours(
        exchange: string
      ): Promise<MarketHoursSnapshot | null> {
        const payload = await fetchFmpJson("/stable/exchange-market-hours", {
          exchange,
        })

        return mapMarketHours(asArray(payload)[0])
      },
      async getAllExchangeMarketHours(): Promise<MarketHoursSnapshot[]> {
        const payload = await fetchFmpJson("/stable/all-exchange-market-hours")

        return asArray(payload)
          .map(mapMarketHours)
          .filter((item): item is MarketHoursSnapshot => item !== null)
      },
      async getHolidaysByExchange(exchange: string): Promise<MarketHoliday[]> {
        const payload = await fetchFmpJson("/stable/holidays-by-exchange", {
          exchange,
        })

        return asArray(payload)
          .map(mapMarketHoliday)
          .filter((item): item is MarketHoliday => item !== null)
      },
    },
    breadth: {
      async getSectorPeSnapshot(
        date?: string
      ): Promise<SectorValuationSnapshot[]> {
        const payload = await fetchFmpJson("/stable/sector-pe-snapshot", {
          date,
        })

        return asArray(payload)
          .map(mapSectorValuation)
          .filter((item): item is SectorValuationSnapshot => item !== null)
      },
      async getHistoricalSectorPerformance(
        sector: string
      ): Promise<SectorHistoryPoint[]> {
        const payload = await fetchFmpJson(
          "/stable/historical-sector-performance",
          {
            sector,
          }
        )

        return asArray(payload)
          .map(mapSectorHistoryPoint)
          .filter((item): item is SectorHistoryPoint => item !== null)
          .slice(0, 20)
          .reverse()
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
