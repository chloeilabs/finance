import "server-only"

import type { ResearchQuoteRow } from "@/lib/shared/markets/intelligence"
import type {
  PortfolioAllocationBucket,
  PortfolioHoldingFormInput,
  PortfolioHoldingRecord,
  PortfolioHoldingView,
  PortfolioPageData,
  PortfolioSummary,
} from "@/lib/shared/markets/portfolio"

import {
  createMarketStoreNotInitializedError,
  isUndefinedTableError,
  isUniqueViolationError,
  PortfolioDuplicateSymbolError,
} from "./errors"
import { buildResearchRows } from "./service-dossier-research"
import {
  createPortfolioHoldingForUser as createPortfolioHoldingRecordForUser,
  deletePortfolioHoldingForUser as deletePortfolioHoldingRecordForUser,
  ensureDefaultPortfolioForUser,
  getPortfolioHoldingBySymbolForUser,
  getPortfolioHoldingForUser,
  listPortfolioHoldingsForUser,
  replacePortfolioHoldingForUser,
  updatePortfolioCashBalanceForUser as updatePortfolioCashBalanceRecordForUser,
} from "./store"

function rethrowMarketStoreUnavailable(error: unknown): never {
  if (isUndefinedTableError(error)) {
    throw createMarketStoreNotInitializedError()
  }

  throw error
}

function normalizeNotes(notes: string | null | undefined): string | null {
  const normalized = notes?.trim()

  if (!normalized) {
    return null
  }

  return normalized
}

function normalizeTargetWeight(targetWeight: number | null | undefined) {
  if (targetWeight === undefined) {
    return undefined
  }

  if (targetWeight === null) {
    return null
  }

  return targetWeight / 100
}

function resolveNextTargetWeight(params: {
  currentTargetWeight: number | null
  targetWeight: number | null | undefined
}) {
  if (params.targetWeight === undefined) {
    return params.currentTargetWeight
  }

  return normalizeTargetWeight(params.targetWeight) ?? null
}

function toHoldingLookupMap(rows: ResearchQuoteRow[]) {
  return new Map(rows.map((row) => [row.symbol, row] as const))
}

function sortAllocationBuckets(buckets: PortfolioAllocationBucket[]) {
  return [...buckets].sort((left, right) => right.value - left.value)
}

function getInstrumentLabel(instrumentKind: PortfolioHoldingView["instrumentKind"]) {
  return instrumentKind === "etf" ? "ETF" : "Stock"
}

function getSectorLabel(sector: string | null) {
  const normalized = sector?.trim()

  return normalized === "" ? "Unclassified" : (normalized ?? "Unclassified")
}

export function buildPortfolioAllocationBuckets(params: {
  holdings: PortfolioHoldingView[]
  totalValue: number
  cashBalance: number
}): {
  instrumentAllocations: PortfolioAllocationBucket[]
  sectorAllocations: PortfolioAllocationBucket[]
} {
  const instrumentTotals = new Map<string, number>()
  const sectorTotals = new Map<string, number>()

  for (const holding of params.holdings) {
    const instrumentLabel = getInstrumentLabel(holding.instrumentKind)

    instrumentTotals.set(
      instrumentLabel,
      (instrumentTotals.get(instrumentLabel) ?? 0) + holding.marketValue
    )

    const sectorLabel = getSectorLabel(holding.sector)
    sectorTotals.set(
      sectorLabel,
      (sectorTotals.get(sectorLabel) ?? 0) + holding.marketValue
    )
  }

  if (params.cashBalance > 0) {
    instrumentTotals.set("Cash", (instrumentTotals.get("Cash") ?? 0) + params.cashBalance)
  }

  const instrumentAllocations = sortAllocationBuckets(
    [...instrumentTotals.entries()].map(([label, value]) => ({
      label,
      value,
      weight: params.totalValue > 0 ? value / params.totalValue : 0,
    }))
  )

  const investedValue = params.holdings.reduce(
    (total, holding) => total + holding.marketValue,
    0
  )

  const sectorAllocations = sortAllocationBuckets(
    [...sectorTotals.entries()].map(([label, value]) => ({
      label,
      value,
      weight: investedValue > 0 ? value / investedValue : 0,
    }))
  )

  return {
    instrumentAllocations,
    sectorAllocations,
  }
}

export function buildPortfolioSummary(params: {
  holdings: PortfolioHoldingView[]
  cashBalance: number
}): PortfolioSummary {
  const investedValue = params.holdings.reduce(
    (total, holding) => total + holding.marketValue,
    0
  )
  const totalCostBasis = params.holdings.reduce(
    (total, holding) => total + holding.costBasis,
    0
  )
  const weightedAverageDividendYieldValue = params.holdings.reduce(
    (total, holding) =>
      total + holding.marketValue * (holding.dividendYieldTtm ?? 0),
    0
  )
  const dayChangeValue = params.holdings.reduce(
    (total, holding) => total + (holding.dayChangeValue ?? 0),
    0
  )
  const totalValue = investedValue + params.cashBalance
  const totalValuePreviousClose = totalValue - dayChangeValue
  const unrealizedGainLoss = params.holdings.reduce(
    (total, holding) => total + holding.unrealizedGainLoss,
    0
  )
  const topHolding = [...params.holdings]
    .sort((left, right) => right.marketValue - left.marketValue)[0]

  return {
    totalValue,
    investedValue,
    totalCostBasis,
    weightedAverageDividendYield:
      investedValue > 0 ? weightedAverageDividendYieldValue / investedValue : null,
    cashBalance: params.cashBalance,
    dayChangeValue,
    dayChangePercent:
      totalValuePreviousClose > 0 ? dayChangeValue / totalValuePreviousClose : null,
    unrealizedGainLoss,
    unrealizedGainLossPercent:
      totalCostBasis > 0 ? unrealizedGainLoss / totalCostBasis : null,
    holdingCount: params.holdings.length,
    topPositionConcentration:
      topHolding?.marketValue !== undefined && totalValue > 0
        ? topHolding.marketValue / totalValue
        : null,
  }
}

export function buildPortfolioHoldingViews(params: {
  holdings: PortfolioHoldingRecord[]
  researchRows: ResearchQuoteRow[]
  cashBalance: number
}): PortfolioHoldingView[] {
  const researchBySymbol = toHoldingLookupMap(params.researchRows)
  const baseRows = params.holdings.map((holding) => {
    const research = researchBySymbol.get(holding.symbol)
    const price = research?.price ?? holding.averageCost
    const costBasis = holding.shares * holding.averageCost
    const marketValue = holding.shares * price
    const dayChangeValue =
      research?.change !== null && research?.change !== undefined
        ? research.change * holding.shares
        : null
    const unrealizedGainLoss = marketValue - costBasis

    return {
      ...holding,
      instrumentKind: research?.instrumentKind ?? "stock",
      name: research?.name ?? null,
      currency: research?.currency ?? "USD",
      sector: research?.sector ?? null,
      price: research?.price ?? null,
      marketValue,
      costBasis,
      dayChangeValue,
      dayChangePercent: research?.changesPercentage ?? null,
      unrealizedGainLoss,
      unrealizedGainLossPercent:
        costBasis > 0 ? unrealizedGainLoss / costBasis : null,
      weight: null,
      nextEarningsDate: research?.nextEarningsDate ?? null,
      dividendYieldTtm: research?.dividendYieldTtm ?? null,
      analystConsensus: research?.analystConsensus ?? null,
    } satisfies PortfolioHoldingView
  })

  const totalValue =
    params.cashBalance +
    baseRows.reduce((total, holding) => total + holding.marketValue, 0)

  return baseRows
    .map((holding) => ({
      ...holding,
      weight: totalValue > 0 ? holding.marketValue / totalValue : null,
    }))
    .sort((left, right) => right.marketValue - left.marketValue)
}

export async function getPortfolioPageData(
  userId: string
): Promise<PortfolioPageData> {
  const portfolio = await ensureDefaultPortfolioForUser(userId).catch((error: unknown) =>
    rethrowMarketStoreUnavailable(error)
  )
  const holdings = await listPortfolioHoldingsForUser({ userId }).catch((error: unknown) =>
    rethrowMarketStoreUnavailable(error)
  )
  const researchRows = await buildResearchRows(holdings.map((holding) => holding.symbol))
  const holdingViews = buildPortfolioHoldingViews({
    holdings,
    researchRows,
    cashBalance: portfolio.cashBalance,
  })
  const summary = buildPortfolioSummary({
    holdings: holdingViews,
    cashBalance: portfolio.cashBalance,
  })
  const allocations = buildPortfolioAllocationBuckets({
    holdings: holdingViews,
    totalValue: summary.totalValue,
    cashBalance: portfolio.cashBalance,
  })

  return {
    portfolio,
    summary,
    holdings: holdingViews,
    sectorAllocations: allocations.sectorAllocations,
    instrumentAllocations: allocations.instrumentAllocations,
  }
}

export async function updatePortfolioCashBalanceForUser(params: {
  userId: string
  cashBalance: number
}) {
  await ensureDefaultPortfolioForUser(params.userId).catch((error: unknown) =>
    rethrowMarketStoreUnavailable(error)
  )

  return updatePortfolioCashBalanceRecordForUser({
    userId: params.userId,
    cashBalance: params.cashBalance,
  }).catch((error: unknown) => rethrowMarketStoreUnavailable(error))
}

export async function createPortfolioHoldingForUser(params: {
  userId: string
  input: PortfolioHoldingFormInput
}) {
  const portfolio = await ensureDefaultPortfolioForUser(params.userId).catch((error: unknown) =>
    rethrowMarketStoreUnavailable(error)
  )
  const existing = await getPortfolioHoldingBySymbolForUser({
    userId: params.userId,
    portfolioId: portfolio.id,
    symbol: params.input.symbol,
  }).catch((error: unknown) => rethrowMarketStoreUnavailable(error))

  if (existing) {
    throw new PortfolioDuplicateSymbolError()
  }

  try {
    return await createPortfolioHoldingRecordForUser({
      userId: params.userId,
      portfolioId: portfolio.id,
      symbol: params.input.symbol,
      shares: params.input.shares,
      averageCost: params.input.averageCost,
      targetWeight: normalizeTargetWeight(params.input.targetWeight) ?? null,
      notes: normalizeNotes(params.input.notes),
    })
  } catch (error: unknown) {
    if (isUniqueViolationError(error)) {
      throw new PortfolioDuplicateSymbolError()
    }

    return rethrowMarketStoreUnavailable(error)
  }
}

export async function updatePortfolioHoldingForUser(params: {
  userId: string
  holdingId: string
  input: Partial<PortfolioHoldingFormInput>
}) {
  const currentHolding = await getPortfolioHoldingForUser({
    userId: params.userId,
    holdingId: params.holdingId,
  }).catch((error: unknown) => rethrowMarketStoreUnavailable(error))

  if (!currentHolding) {
    return null
  }

  const nextSymbol =
    params.input.symbol?.trim() && params.input.symbol.trim() !== ""
      ? params.input.symbol
      : currentHolding.symbol

  const duplicate = await getPortfolioHoldingBySymbolForUser({
    userId: params.userId,
    symbol: nextSymbol,
  }).catch((error: unknown) => rethrowMarketStoreUnavailable(error))

  if (duplicate && duplicate.id !== currentHolding.id) {
    throw new PortfolioDuplicateSymbolError()
  }

  try {
    return await replacePortfolioHoldingForUser({
      userId: params.userId,
      holdingId: params.holdingId,
      symbol: nextSymbol,
      shares: params.input.shares ?? currentHolding.shares,
      averageCost: params.input.averageCost ?? currentHolding.averageCost,
      targetWeight: resolveNextTargetWeight({
        currentTargetWeight: currentHolding.targetWeight,
        targetWeight: params.input.targetWeight,
      }),
      notes:
        params.input.notes !== undefined
          ? normalizeNotes(params.input.notes)
          : currentHolding.notes,
    })
  } catch (error: unknown) {
    if (isUniqueViolationError(error)) {
      throw new PortfolioDuplicateSymbolError()
    }

    return rethrowMarketStoreUnavailable(error)
  }
}

export async function deletePortfolioHoldingForUser(params: {
  userId: string
  holdingId: string
}) {
  return deletePortfolioHoldingRecordForUser({
    userId: params.userId,
    holdingId: params.holdingId,
  }).catch((error: unknown) => rethrowMarketStoreUnavailable(error))
}
