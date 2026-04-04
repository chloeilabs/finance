import "server-only"

import { sql } from "kysely"

import type {
  PortfolioHoldingRecord,
  PortfolioRecord,
} from "@/lib/shared/markets/portfolio"

import { getDatabase } from "../postgres"
import {
  mapPortfolioHoldingRow,
  mapPortfolioRow,
  normalizeSymbols,
  type PortfolioHoldingRow,
  type PortfolioRow,
} from "./store-support"

const DEFAULT_PORTFOLIO_ID = "default"
const DEFAULT_PORTFOLIO_NAME = "Portfolio"
const DEFAULT_BASE_CURRENCY = "USD"

function normalizeSymbol(symbol: string) {
  return normalizeSymbols([symbol])[0] ?? ""
}

export async function getPortfolioForUser(
  userId: string,
  portfolioId = DEFAULT_PORTFOLIO_ID
): Promise<PortfolioRecord | null> {
  const database = getDatabase()
  const result = await sql<PortfolioRow>`
    SELECT
      id,
      name,
      "baseCurrency",
      "cashBalance",
      "createdAt",
      "updatedAt"
    FROM portfolio
    WHERE "userId" = ${userId}
      AND id = ${portfolioId}
    LIMIT 1
  `.execute(database)

  const row = result.rows[0]
  return row ? mapPortfolioRow(row) : null
}

export async function createPortfolioForUser(params: {
  userId: string
  id?: string
  name?: string
  baseCurrency?: string
  cashBalance?: number
}): Promise<PortfolioRecord> {
  const database = getDatabase()
  const now = new Date()
  const id = params.id ?? DEFAULT_PORTFOLIO_ID

  await sql`
    INSERT INTO portfolio (
      "userId",
      id,
      name,
      "baseCurrency",
      "cashBalance",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${params.userId},
      ${id},
      ${params.name ?? DEFAULT_PORTFOLIO_NAME},
      ${params.baseCurrency ?? DEFAULT_BASE_CURRENCY},
      ${params.cashBalance ?? 0},
      ${now},
      ${now}
    )
    ON CONFLICT ("userId", id)
    DO UPDATE SET
      name = EXCLUDED.name,
      "baseCurrency" = EXCLUDED."baseCurrency",
      "cashBalance" = EXCLUDED."cashBalance",
      "updatedAt" = EXCLUDED."updatedAt"
  `.execute(database)

  const portfolio = await getPortfolioForUser(params.userId, id)

  if (!portfolio) {
    throw new Error("Failed to create portfolio.")
  }

  return portfolio
}

export async function ensureDefaultPortfolioForUser(
  userId: string
): Promise<PortfolioRecord> {
  const existing = await getPortfolioForUser(userId)

  if (existing) {
    return existing
  }

  return createPortfolioForUser({
    userId,
  })
}

export async function updatePortfolioCashBalanceForUser(params: {
  userId: string
  portfolioId?: string
  cashBalance: number
}): Promise<PortfolioRecord | null> {
  const database = getDatabase()

  await sql`
    UPDATE portfolio
    SET
      "cashBalance" = ${params.cashBalance},
      "updatedAt" = ${new Date()}
    WHERE "userId" = ${params.userId}
      AND id = ${params.portfolioId ?? DEFAULT_PORTFOLIO_ID}
  `.execute(database)

  return getPortfolioForUser(
    params.userId,
    params.portfolioId ?? DEFAULT_PORTFOLIO_ID
  )
}

export async function listPortfolioHoldingsForUser(params: {
  userId: string
  portfolioId?: string
}): Promise<PortfolioHoldingRecord[]> {
  const database = getDatabase()
  const result = await sql<PortfolioHoldingRow>`
    SELECT
      id,
      symbol,
      shares,
      "averageCost",
      "targetWeight",
      notes,
      "createdAt",
      "updatedAt"
    FROM portfolio_holdings
    WHERE "userId" = ${params.userId}
      AND "portfolioId" = ${params.portfolioId ?? DEFAULT_PORTFOLIO_ID}
    ORDER BY "updatedAt" DESC, id ASC
  `.execute(database)

  return result.rows.map(mapPortfolioHoldingRow)
}

export async function getPortfolioHoldingForUser(params: {
  userId: string
  holdingId: string
}): Promise<PortfolioHoldingRecord | null> {
  const database = getDatabase()
  const result = await sql<PortfolioHoldingRow>`
    SELECT
      id,
      symbol,
      shares,
      "averageCost",
      "targetWeight",
      notes,
      "createdAt",
      "updatedAt"
    FROM portfolio_holdings
    WHERE "userId" = ${params.userId}
      AND id = ${params.holdingId}
    LIMIT 1
  `.execute(database)

  const row = result.rows[0]
  return row ? mapPortfolioHoldingRow(row) : null
}

export async function getPortfolioHoldingBySymbolForUser(params: {
  userId: string
  portfolioId?: string
  symbol: string
}): Promise<PortfolioHoldingRecord | null> {
  const database = getDatabase()
  const result = await sql<PortfolioHoldingRow>`
    SELECT
      id,
      symbol,
      shares,
      "averageCost",
      "targetWeight",
      notes,
      "createdAt",
      "updatedAt"
    FROM portfolio_holdings
    WHERE "userId" = ${params.userId}
      AND "portfolioId" = ${params.portfolioId ?? DEFAULT_PORTFOLIO_ID}
      AND symbol = ${normalizeSymbol(params.symbol)}
    LIMIT 1
  `.execute(database)

  const row = result.rows[0]
  return row ? mapPortfolioHoldingRow(row) : null
}

export async function createPortfolioHoldingForUser(params: {
  userId: string
  portfolioId?: string
  id?: string
  symbol: string
  shares: number
  averageCost: number
  targetWeight: number | null
  notes: string | null
}): Promise<PortfolioHoldingRecord> {
  const database = getDatabase()
  const now = new Date()
  const id = params.id ?? crypto.randomUUID()
  const symbol = normalizeSymbol(params.symbol)

  const result = await sql<PortfolioHoldingRow>`
    INSERT INTO portfolio_holdings (
      "userId",
      "portfolioId",
      id,
      symbol,
      shares,
      "averageCost",
      "targetWeight",
      notes,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${params.userId},
      ${params.portfolioId ?? DEFAULT_PORTFOLIO_ID},
      ${id},
      ${symbol},
      ${params.shares},
      ${params.averageCost},
      ${params.targetWeight},
      ${params.notes},
      ${now},
      ${now}
    )
    RETURNING
      id,
      symbol,
      shares,
      "averageCost",
      "targetWeight",
      notes,
      "createdAt",
      "updatedAt"
  `.execute(database)

  const row = result.rows[0]

  if (!row) {
    throw new Error("Failed to create portfolio holding.")
  }

  return mapPortfolioHoldingRow(row)
}

export async function replacePortfolioHoldingForUser(params: {
  userId: string
  holdingId: string
  symbol: string
  shares: number
  averageCost: number
  targetWeight: number | null
  notes: string | null
}): Promise<PortfolioHoldingRecord | null> {
  const database = getDatabase()
  const result = await sql<PortfolioHoldingRow>`
    UPDATE portfolio_holdings
    SET
      symbol = ${normalizeSymbol(params.symbol)},
      shares = ${params.shares},
      "averageCost" = ${params.averageCost},
      "targetWeight" = ${params.targetWeight},
      notes = ${params.notes},
      "updatedAt" = ${new Date()}
    WHERE "userId" = ${params.userId}
      AND id = ${params.holdingId}
    RETURNING
      id,
      symbol,
      shares,
      "averageCost",
      "targetWeight",
      notes,
      "createdAt",
      "updatedAt"
  `.execute(database)

  const row = result.rows[0]
  return row ? mapPortfolioHoldingRow(row) : null
}

export async function deletePortfolioHoldingForUser(params: {
  userId: string
  holdingId: string
}): Promise<boolean> {
  const database = getDatabase()
  const result = await sql<{ id: string }>`
    DELETE FROM portfolio_holdings
    WHERE "userId" = ${params.userId}
      AND id = ${params.holdingId}
    RETURNING id
  `.execute(database)

  return result.rows.length > 0
}
