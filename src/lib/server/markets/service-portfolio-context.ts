import "server-only"

import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/markets-format"
import type { QuoteSnapshot } from "@/lib/shared/markets/core"
import type { ResearchQuoteRow } from "@/lib/shared/markets/intelligence"
import type {
  PortfolioHoldingRecord,
  PortfolioHoldingView,
} from "@/lib/shared/markets/portfolio"

import {
  buildPortfolioHoldingViews,
  buildPortfolioSummary,
} from "./service-portfolio"
import {
  getCachedQuoteSnapshot,
  mapWithConcurrency,
  QUOTE_FETCH_CONCURRENCY,
} from "./service-support"
import { getPortfolioForUser, listPortfolioHoldingsForUser } from "./store"

export type AgentPortfolioPromptContextStatus =
  | "ready"
  | "empty"
  | "unavailable"

export interface AgentPortfolioPromptSummary {
  dayChangePercent: number | null
  dayChangeValue: number
  cashBalance: number
  holdingCount: number
  investedValue: number
  topPositionConcentration: number | null
  totalCostBasis: number
  totalValue: number
  unrealizedGainLoss: number
  unrealizedGainLossPercent: number | null
}

export interface AgentPortfolioPromptHolding {
  symbol: string
  shares: number
  averageCost: number
  costBasis: number
  dayChangePercent: number | null
  dayChangeValue: number | null
  latestPrice: number
  latestPriceSource: "quote" | "average_cost"
  marketValue: number
  notes: string | null
  targetWeight: number | null
  unrealizedGainLoss: number
  unrealizedGainLossPercent: number | null
  weight: number | null
}

export type AgentPortfolioPromptContext =
  | {
      status: "ready"
      snapshotAt: string
      summary: AgentPortfolioPromptSummary
      holdings: AgentPortfolioPromptHolding[]
    }
  | {
      status: "empty"
      snapshotAt: string
    }
  | {
      status: "unavailable"
      snapshotAt: string
    }

interface FormatAgentPortfolioPromptContextOptions {
  maxCharacters?: number
  noteMaxChars?: number
}

interface PortfolioPromptRenderStage {
  includeGuidance: boolean
  includeLatestPrice: boolean
  includeLatestPriceSource: boolean
  includeNotes: boolean
  includeTargetWeight: boolean
  includeWeight: boolean
  rowMode: "full" | "compact_list" | "symbols_only"
}

const DEFAULT_NOTE_MAX_CHARS = 140
const DEFAULT_MAX_CONTEXT_CHARS = 3_200
const PORTFOLIO_CONTEXT_GUIDANCE = [
  "- Use this saved portfolio snapshot as the default portfolio context for this request.",
  "- The numeric fields below are authoritative for this saved portfolio snapshot.",
  "- Prefer the provided day_pl and total_pl fields over recomputing gains or losses from price and cost.",
  "- If the user describes holdings that conflict with this snapshot, ask a clarifying question instead of assuming the portfolio already changed.",
]

const PORTFOLIO_RENDER_STAGES: readonly PortfolioPromptRenderStage[] = [
  {
    includeGuidance: true,
    includeLatestPrice: true,
    includeLatestPriceSource: true,
    includeNotes: true,
    includeTargetWeight: true,
    includeWeight: true,
    rowMode: "full",
  },
  {
    includeGuidance: true,
    includeLatestPrice: true,
    includeLatestPriceSource: true,
    includeNotes: false,
    includeTargetWeight: true,
    includeWeight: true,
    rowMode: "full",
  },
  {
    includeGuidance: true,
    includeLatestPrice: true,
    includeLatestPriceSource: true,
    includeNotes: false,
    includeTargetWeight: false,
    includeWeight: true,
    rowMode: "full",
  },
  {
    includeGuidance: true,
    includeLatestPrice: true,
    includeLatestPriceSource: true,
    includeNotes: false,
    includeTargetWeight: false,
    includeWeight: false,
    rowMode: "full",
  },
  {
    includeGuidance: true,
    includeLatestPrice: true,
    includeLatestPriceSource: false,
    includeNotes: false,
    includeTargetWeight: false,
    includeWeight: false,
    rowMode: "full",
  },
  {
    includeGuidance: true,
    includeLatestPrice: false,
    includeLatestPriceSource: false,
    includeNotes: false,
    includeTargetWeight: false,
    includeWeight: false,
    rowMode: "full",
  },
  {
    includeGuidance: true,
    includeLatestPrice: false,
    includeLatestPriceSource: false,
    includeNotes: false,
    includeTargetWeight: false,
    includeWeight: false,
    rowMode: "full",
  },
  {
    includeGuidance: false,
    includeLatestPrice: false,
    includeLatestPriceSource: false,
    includeNotes: false,
    includeTargetWeight: false,
    includeWeight: false,
    rowMode: "compact_list",
  },
  {
    includeGuidance: false,
    includeLatestPrice: false,
    includeLatestPriceSource: false,
    includeNotes: false,
    includeTargetWeight: false,
    includeWeight: false,
    rowMode: "symbols_only",
  },
] as const

function normalizePromptText(value: string | null | undefined): string | null {
  const normalized = value?.replace(/\s+/g, " ").trim()
  if (!normalized) {
    return null
  }

  return normalized
}

function truncatePromptText(value: string, maxChars: number): string {
  if (maxChars <= 0 || value.length <= maxChars) {
    return value
  }

  if (maxChars <= 1) {
    return value.slice(0, maxChars)
  }

  return `${value.slice(0, maxChars - 1).trimEnd()}…`
}

function toQuoteResearchRow(
  holding: PortfolioHoldingRecord,
  quote: QuoteSnapshot | null
): ResearchQuoteRow {
  return {
    symbol: holding.symbol,
    name: quote?.name ?? null,
    currency: quote?.currency ?? null,
    change: quote?.change ?? null,
    price: quote?.price ?? null,
    changesPercentage: quote?.changesPercentage ?? null,
    marketCap: quote?.marketCap ?? null,
    sector: null,
    rsi14: null,
    nextEarningsDate: null,
    analystConsensus: null,
    piotroskiScore: null,
    altmanZScore: null,
    fcfYield: null,
    dividendYieldTtm: null,
    dividendPerShareTtm: null,
    dividendPayoutRatioTtm: null,
    roic: null,
    dcf: null,
    freeFloatPercentage: null,
    floatShares: null,
  }
}

function resolveLatestPriceSource(quote: QuoteSnapshot | null) {
  return quote?.price !== null && quote?.price !== undefined
    ? "quote"
    : "average_cost"
}

function toPromptHolding(
  holding: PortfolioHoldingView,
  quote: QuoteSnapshot | null
): AgentPortfolioPromptHolding {
  return {
    symbol: holding.symbol,
    shares: holding.shares,
    averageCost: holding.averageCost,
    costBasis: holding.costBasis,
    dayChangePercent: holding.dayChangePercent,
    dayChangeValue: holding.dayChangeValue,
    latestPrice: quote?.price ?? holding.averageCost,
    latestPriceSource: resolveLatestPriceSource(quote),
    marketValue: holding.marketValue,
    notes: normalizePromptText(holding.notes),
    targetWeight: holding.targetWeight,
    unrealizedGainLoss: holding.unrealizedGainLoss,
    unrealizedGainLossPercent: holding.unrealizedGainLossPercent,
    weight: holding.weight,
  }
}

async function getPortfolioHoldingQuotes(
  holdings: PortfolioHoldingRecord[]
): Promise<(QuoteSnapshot | null)[]> {
  return mapWithConcurrency(
    holdings,
    QUOTE_FETCH_CONCURRENCY,
    async (holding) => {
      try {
        return await getCachedQuoteSnapshot(holding.symbol)
      } catch {
        return null
      }
    }
  )
}

function formatSummaryLine(summary: AgentPortfolioPromptSummary) {
  return [
    `total_value ${formatCurrency(summary.totalValue)}`,
    `invested_value ${formatCurrency(summary.investedValue)}`,
    `total_cost_basis ${formatCurrency(summary.totalCostBasis)}`,
    `cash ${formatCurrency(summary.cashBalance)}`,
    `holdings ${String(summary.holdingCount)}`,
    `day_pl ${formatCurrency(summary.dayChangeValue)}${
      summary.dayChangePercent !== null
        ? ` (${formatPercent(summary.dayChangePercent, {
            decimals: 2,
            scale: "fraction",
          })})`
        : ""
    }`,
    `total_pl ${formatCurrency(summary.unrealizedGainLoss)}${
      summary.unrealizedGainLossPercent !== null
        ? ` (${formatPercent(summary.unrealizedGainLossPercent, {
            decimals: 2,
            scale: "fraction",
          })})`
        : ""
    }`,
    `top_concentration ${
      summary.topPositionConcentration !== null
        ? formatPercent(summary.topPositionConcentration, {
            decimals: 1,
            scale: "fraction",
          })
        : "N/A"
    }`,
  ].join(" | ")
}

function formatHoldingLine(
  holding: AgentPortfolioPromptHolding,
  stage: PortfolioPromptRenderStage,
  noteMaxChars: number
): string {
  const parts = [
    holding.symbol,
    `shares ${formatNumber(holding.shares, { digits: 4 })}`,
    `avg_cost ${formatCurrency(holding.averageCost)}`,
    `cost_basis ${formatCurrency(holding.costBasis)}`,
    `market_value ${formatCurrency(holding.marketValue)}`,
    `day_pl ${
      holding.dayChangeValue !== null
        ? formatCurrency(holding.dayChangeValue)
        : "N/A"
    }${
      holding.dayChangePercent !== null
        ? ` (${formatPercent(holding.dayChangePercent, {
            decimals: 2,
            scale: "fraction",
          })})`
        : ""
    }`,
    `total_pl ${formatCurrency(holding.unrealizedGainLoss)}${
      holding.unrealizedGainLossPercent !== null
        ? ` (${formatPercent(holding.unrealizedGainLossPercent, {
            decimals: 2,
            scale: "fraction",
          })})`
        : ""
    }`,
  ]

  if (stage.includeLatestPrice) {
    parts.push(`last_price ${formatCurrency(holding.latestPrice)}`)
  }

  if (stage.includeLatestPrice && stage.includeLatestPriceSource) {
    parts.push(
      `price_source ${
        holding.latestPriceSource === "quote" ? "quote" : "avg_cost_fallback"
      }`
    )
  }

  if (stage.includeWeight && holding.weight !== null) {
    parts.push(
      `weight ${formatPercent(holding.weight, { decimals: 1, scale: "fraction" })}`
    )
  }

  if (stage.includeTargetWeight && holding.targetWeight !== null) {
    parts.push(
      `target_weight ${formatPercent(holding.targetWeight, {
        decimals: 1,
        scale: "fraction",
      })}`
    )
  }

  if (stage.includeNotes && holding.notes) {
    parts.push(`notes ${truncatePromptText(holding.notes, noteMaxChars)}`)
  }

  return `- ${parts.join(" | ")}`
}

function formatHoldingRows(
  holdings: AgentPortfolioPromptHolding[],
  stage: PortfolioPromptRenderStage,
  noteMaxChars: number
): string[] {
  if (holdings.length === 0) {
    return [
      "- No saved positions. Use the summary above for cash-only portfolio questions.",
    ]
  }

  if (stage.rowMode === "compact_list") {
    return [
      `- Holdings: ${holdings
        .map(
          (holding) =>
            `${holding.symbol} (${formatNumber(holding.shares, { digits: 4 })} sh)`
        )
        .join("; ")}`,
    ]
  }

  if (stage.rowMode === "symbols_only") {
    return [
      `- Holdings: ${holdings.map((holding) => holding.symbol).join(", ")}`,
    ]
  }

  return holdings.map((holding) =>
    formatHoldingLine(holding, stage, noteMaxChars)
  )
}

function formatReadyPortfolioContext(
  context: Extract<AgentPortfolioPromptContext, { status: "ready" }>,
  stage: PortfolioPromptRenderStage,
  noteMaxChars: number
): string {
  return [
    "# Runtime Portfolio Context",
    "",
    "This section is generated from the saved portfolio for the current request.",
    "",
    `- Snapshot generated at: ${context.snapshotAt}`,
    `- Summary: ${formatSummaryLine(context.summary)}`,
    ...(stage.includeGuidance ? PORTFOLIO_CONTEXT_GUIDANCE : []),
    "- Holdings snapshot:",
    ...formatHoldingRows(context.holdings, stage, noteMaxChars),
  ].join("\n")
}

function truncateFinalContext(body: string, maxCharacters: number) {
  if (body.length <= maxCharacters) {
    return body
  }

  if (maxCharacters <= 1) {
    return body.slice(0, maxCharacters)
  }

  return `${body.slice(0, maxCharacters - 1).trimEnd()}…`
}

export async function getAgentPortfolioPromptContext(params: {
  now?: Date
  userId: string
}): Promise<AgentPortfolioPromptContext> {
  const snapshotAt = (params.now ?? new Date()).toISOString()

  try {
    const [portfolio, holdings] = await Promise.all([
      getPortfolioForUser(params.userId),
      listPortfolioHoldingsForUser({ userId: params.userId }),
    ])
    const cashBalance = portfolio?.cashBalance ?? 0

    if (holdings.length === 0 && cashBalance <= 0) {
      return {
        status: "empty",
        snapshotAt,
      }
    }

    const quotes =
      holdings.length > 0 ? await getPortfolioHoldingQuotes(holdings) : []
    const holdingViews = buildPortfolioHoldingViews({
      holdings,
      researchRows: holdings.map((holding, index) =>
        toQuoteResearchRow(holding, quotes[index] ?? null)
      ),
      cashBalance,
    })
    const summary = buildPortfolioSummary({
      holdings: holdingViews,
      cashBalance,
    })

    return {
      status: "ready",
      snapshotAt,
      summary: {
        dayChangePercent: summary.dayChangePercent,
        dayChangeValue: summary.dayChangeValue,
        cashBalance: summary.cashBalance,
        holdingCount: summary.holdingCount,
        investedValue: summary.investedValue,
        topPositionConcentration: summary.topPositionConcentration,
        totalCostBasis: summary.totalCostBasis,
        totalValue: summary.totalValue,
        unrealizedGainLoss: summary.unrealizedGainLoss,
        unrealizedGainLossPercent: summary.unrealizedGainLossPercent,
      },
      holdings: holdingViews.map((holding, index) =>
        toPromptHolding(holding, quotes[index] ?? null)
      ),
    }
  } catch {
    return {
      status: "unavailable",
      snapshotAt,
    }
  }
}

export function formatAgentPortfolioPromptContext(
  context: AgentPortfolioPromptContext,
  options: FormatAgentPortfolioPromptContextOptions = {}
): string {
  if (context.status === "empty") {
    return [
      "# Runtime Portfolio Context",
      "",
      "This section is generated from the saved portfolio for the current request.",
      "",
      `- Snapshot generated at: ${context.snapshotAt}`,
      "- No saved holdings or cash balance were found for this user.",
      "- Do not invent positions or allocation details.",
      "- If the user asks about their portfolio, ask them to add holdings or describe the portfolio they want analyzed.",
    ].join("\n")
  }

  if (context.status === "unavailable") {
    return [
      "# Runtime Portfolio Context",
      "",
      "This section could not be loaded for the current request.",
      "",
      `- Snapshot generated at: ${context.snapshotAt}`,
      "- Portfolio context status: unavailable for this turn.",
      "- Do not assume the user's current holdings or cash balance from earlier messages alone.",
      "- If the user asks for portfolio-specific advice, ask for the current holdings or explain that the saved portfolio context was unavailable for this turn.",
    ].join("\n")
  }

  const maxCharacters = options.maxCharacters ?? DEFAULT_MAX_CONTEXT_CHARS
  const noteMaxChars = options.noteMaxChars ?? DEFAULT_NOTE_MAX_CHARS
  const finalStage: PortfolioPromptRenderStage = PORTFOLIO_RENDER_STAGES[
    PORTFOLIO_RENDER_STAGES.length - 1
  ] ?? {
    includeGuidance: false,
    includeLatestPrice: false,
    includeLatestPriceSource: false,
    includeNotes: false,
    includeTargetWeight: false,
    includeWeight: false,
    rowMode: "symbols_only",
  }

  for (const stage of PORTFOLIO_RENDER_STAGES) {
    const candidate = formatReadyPortfolioContext(context, stage, noteMaxChars)
    if (candidate.length <= maxCharacters) {
      return candidate
    }
  }

  return truncateFinalContext(
    formatReadyPortfolioContext(context, finalStage, noteMaxChars),
    maxCharacters
  )
}
