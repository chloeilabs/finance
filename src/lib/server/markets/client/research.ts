import type { CalendarEvent, NewsStory } from "@/lib/shared/markets/core"
import type {
  AnalystEstimateSnapshot,
  AnalystSummary,
  FilingEntry,
  GradesConsensus,
  RatingsHistoricalEntry,
} from "@/lib/shared/markets/intelligence"

import { fetchFmpJson } from "../fmp-request"
import { asArray, asRecord, pickNumber, pickString } from "./support"

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
      pickNumber(record, [
        "dividend",
        "adjDividend",
        "actual",
        "previous",
      ])?.toString() ??
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

function mapRatingsHistoricalEntry(
  item: unknown
): RatingsHistoricalEntry | null {
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

export function createResearchClient() {
  return {
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
      async getGradesConsensus(
        symbol: string
      ): Promise<GradesConsensus | null> {
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
          .filter((item): item is AnalystEstimateSnapshot => item !== null)
      },
      async getRatingsHistorical(
        symbol: string
      ): Promise<RatingsHistoricalEntry[]> {
        const payload = await fetchFmpJson("/stable/ratings-historical", {
          symbol,
        })

        return asArray(payload)
          .map(mapRatingsHistoricalEntry)
          .filter((item): item is RatingsHistoricalEntry => item !== null)
          .slice(0, 8)
      },
    },
    filings: {
      async getSecFilings(
        symbol: string,
        from: string,
        to: string
      ): Promise<FilingEntry[]> {
        const payload = await fetchFmpJson("/stable/sec-filings-search/symbol", {
          symbol,
          from,
          to,
          page: 0,
          limit: 10,
        })

        return asArray(payload)
          .map(mapFiling)
          .filter((item): item is FilingEntry => item !== null)
      },
    },
  }
}
