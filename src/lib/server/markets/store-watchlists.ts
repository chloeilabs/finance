import "server-only"

import { sql } from "kysely"

import type { WatchlistRecord } from "@/lib/shared/markets/workspace"

import { getDatabase } from "../postgres"
import {
  mapWatchlistRow,
  normalizeSymbols,
  type WatchlistRow,
} from "./store-support"

async function syncWatchlistItems(params: {
  userId: string
  watchlistId: string
  symbols: string[]
}) {
  const database = getDatabase()

  await sql`
    DELETE FROM watchlist_items
    WHERE "userId" = ${params.userId}
      AND "watchlistId" = ${params.watchlistId}
  `.execute(database)

  for (const [index, symbol] of params.symbols.entries()) {
    await sql`
      INSERT INTO watchlist_items (
        "userId",
        "watchlistId",
        symbol,
        position,
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${params.userId},
        ${params.watchlistId},
        ${symbol},
        ${index},
        NOW(),
        NOW()
      )
      ON CONFLICT ("userId", "watchlistId", symbol)
      DO UPDATE SET
        position = EXCLUDED.position,
        "updatedAt" = EXCLUDED."updatedAt"
    `.execute(database)
  }
}

export async function listWatchlistsForUser(
  userId: string
): Promise<WatchlistRecord[]> {
  const database = getDatabase()
  const result = await sql<WatchlistRow>`
    SELECT
      id,
      name,
      symbols,
      "createdAt",
      "updatedAt"
    FROM watchlist
    WHERE "userId" = ${userId}
    ORDER BY "updatedAt" DESC, id ASC
  `.execute(database)

  return result.rows.map(mapWatchlistRow)
}

export async function getWatchlistForUser(
  userId: string,
  watchlistId: string
): Promise<WatchlistRecord | null> {
  const database = getDatabase()
  const result = await sql<WatchlistRow>`
    SELECT
      id,
      name,
      symbols,
      "createdAt",
      "updatedAt"
    FROM watchlist
    WHERE "userId" = ${userId}
      AND id = ${watchlistId}
    LIMIT 1
  `.execute(database)

  const row = result.rows[0]
  return row ? mapWatchlistRow(row) : null
}

export async function createWatchlistForUser(params: {
  userId: string
  id?: string
  name: string
  symbols?: string[]
}): Promise<WatchlistRecord> {
  const database = getDatabase()
  const now = new Date()
  const id = params.id ?? crypto.randomUUID()
  const symbols = normalizeSymbols(params.symbols ?? [])

  await sql`
    INSERT INTO watchlist (
      "userId",
      id,
      name,
      symbols,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${params.userId},
      ${id},
      ${params.name.trim()},
      CAST(${JSON.stringify(symbols)} AS jsonb),
      ${now},
      ${now}
    )
    ON CONFLICT ("userId", id)
    DO UPDATE SET
      name = EXCLUDED.name,
      symbols = EXCLUDED.symbols,
      "updatedAt" = EXCLUDED."updatedAt"
  `.execute(database)

  await syncWatchlistItems({
    userId: params.userId,
    watchlistId: id,
    symbols,
  })

  const watchlist = await getWatchlistForUser(params.userId, id)

  if (!watchlist) {
    throw new Error("Failed to create watchlist.")
  }

  return watchlist
}

export async function ensureDefaultWatchlistForUser(
  userId: string,
  symbols: string[]
): Promise<WatchlistRecord> {
  const existing = await listWatchlistsForUser(userId)

  if (existing[0]) {
    return existing[0]
  }

  return createWatchlistForUser({
    userId,
    id: "core",
    name: "Core",
    symbols,
  })
}

export async function replaceWatchlistSymbols(params: {
  userId: string
  watchlistId: string
  symbols: string[]
  name?: string
}): Promise<WatchlistRecord | null> {
  const database = getDatabase()
  const symbols = normalizeSymbols(params.symbols)

  await sql`
    UPDATE watchlist
    SET
      name = COALESCE(${params.name?.trim() ?? null}, name),
      symbols = CAST(${JSON.stringify(symbols)} AS jsonb),
      "updatedAt" = ${new Date()}
    WHERE "userId" = ${params.userId}
      AND id = ${params.watchlistId}
  `.execute(database)

  await syncWatchlistItems({
    userId: params.userId,
    watchlistId: params.watchlistId,
    symbols,
  })

  return getWatchlistForUser(params.userId, params.watchlistId)
}
