import type {
  FinancialScoreSnapshot,
  MetricStat,
  StatementTable,
} from "@/lib/shared/markets/core"

import { fetchFmpJson } from "../fmp-request"
import {
  asArray,
  asNumber,
  asRecord,
  asString,
  pickNumber,
} from "./support"

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
      (row) => (typeof row.date === "string" ? row.date : null) ?? (typeof row.calendarYear === "string" ? row.calendarYear : null) ?? "N/A"
    ),
    rows: params.rowKeys.map(({ key, label }) => ({
      label,
      values: rows.map(
        (row) => asNumber(row[key]) ?? asString(row[key]) ?? null
      ),
    })),
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

export function createFundamentalsClient() {
  return {
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
  }
}
