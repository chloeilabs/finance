import "server-only"

import { sql } from "kysely"

import type {
  SavedScreenerRecord,
  ScreenerFilterState,
  SymbolDirectoryEntry,
  WatchlistRecord,
} from "@/lib/shared"

import { getDatabase } from "../postgres"

interface WatchlistRow {
  id: string
  name: string
  symbols: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

interface SymbolDirectoryRow {
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
  updatedAt: Date | string
}

interface CacheRow {
  payload: unknown
  expiresAt: Date | string
}

interface SavedScreenRow {
  id: string
  name: string
  filters: unknown
  createdAt: Date | string
  updatedAt: Date | string
}

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"
  )
}

function toIsoString(value: Date | string): string {
  const parsed = value instanceof Date ? value : new Date(value)
  return parsed.toISOString()
}

function parseStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean)
}

function mapWatchlistRow(row: WatchlistRow): WatchlistRecord {
  return {
    id: row.id,
    name: row.name,
    symbols: parseStringArray(row.symbols),
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

function mapSymbolDirectoryRow(row: SymbolDirectoryRow): SymbolDirectoryEntry {
  return {
    symbol: row.symbol,
    name: row.name,
    exchange: row.exchange,
    exchangeShortName: row.exchangeShortName,
    type: row.type,
    currency: row.currency,
    sector: row.sector,
    industry: row.industry,
    country: row.country,
    isActivelyTrading: row.isActivelyTrading,
    isEtf: row.isEtf,
    updatedAt: toIsoString(row.updatedAt),
  }
}

function mapSavedScreenRow(row: SavedScreenRow): SavedScreenerRecord {
  return {
    id: row.id,
    name: row.name,
    filters:
      typeof row.filters === "object" && row.filters !== null
        ? (row.filters as ScreenerFilterState)
        : {},
    createdAt: toIsoString(row.createdAt),
    updatedAt: toIsoString(row.updatedAt),
  }
}

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
  const symbols = [
    ...new Set(
      (params.symbols ?? [])
        .map((item) => item.trim().toUpperCase())
        .filter(Boolean)
    ),
  ]

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
  const symbols = [
    ...new Set(
      params.symbols.map((item) => item.trim().toUpperCase()).filter(Boolean)
    ),
  ]

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

export async function upsertSymbolDirectoryEntries(
  entries: SymbolDirectoryEntry[]
): Promise<void> {
  if (entries.length === 0) {
    return
  }

  const database = getDatabase()

  for (const entry of entries) {
    await sql`
      INSERT INTO symbol_directory (
        symbol,
        name,
        exchange,
        "exchangeShortName",
        type,
        currency,
        sector,
        industry,
        country,
        "isActivelyTrading",
        "isEtf",
        "updatedAt"
      )
      VALUES (
        ${entry.symbol},
        ${entry.name},
        ${entry.exchange},
        ${entry.exchangeShortName},
        ${entry.type},
        ${entry.currency},
        ${entry.sector},
        ${entry.industry},
        ${entry.country},
        ${entry.isActivelyTrading},
        ${entry.isEtf},
        ${new Date(entry.updatedAt)}
      )
      ON CONFLICT (symbol)
      DO UPDATE SET
        name = EXCLUDED.name,
        exchange = EXCLUDED.exchange,
        "exchangeShortName" = EXCLUDED."exchangeShortName",
        type = EXCLUDED.type,
        currency = EXCLUDED.currency,
        sector = EXCLUDED.sector,
        industry = EXCLUDED.industry,
        country = EXCLUDED.country,
        "isActivelyTrading" = EXCLUDED."isActivelyTrading",
        "isEtf" = EXCLUDED."isEtf",
        "updatedAt" = EXCLUDED."updatedAt"
    `.execute(database)
  }
}

export async function countSymbolDirectoryEntries(): Promise<number> {
  const database = getDatabase()
  const result = await sql<{ count: string }>`
    SELECT COUNT(*)::text AS count
    FROM symbol_directory
  `.execute(database)

  return Number(result.rows[0]?.count ?? "0")
}

export async function searchSymbolDirectory(params: {
  query: string
  limit?: number
}): Promise<SymbolDirectoryEntry[]> {
  const database = getDatabase()
  const query = params.query.trim()

  if (!query) {
    return []
  }

  const limit = Math.max(1, Math.min(params.limit ?? 8, 20))
  const symbolPrefix = `${query.toUpperCase()}%`
  const fuzzy = `%${query}%`
  const result = await sql<SymbolDirectoryRow>`
    SELECT
      symbol,
      name,
      exchange,
      "exchangeShortName",
      type,
      currency,
      sector,
      industry,
      country,
      "isActivelyTrading",
      "isEtf",
      "updatedAt"
    FROM symbol_directory
    WHERE symbol ILIKE ${symbolPrefix}
      OR name ILIKE ${fuzzy}
    ORDER BY
      CASE WHEN symbol ILIKE ${symbolPrefix} THEN 0 ELSE 1 END,
      "isActivelyTrading" DESC,
      symbol ASC
    LIMIT ${limit}
  `.execute(database)

  return result.rows.map(mapSymbolDirectoryRow)
}

export async function getSymbolDirectoryEntry(
  symbol: string
): Promise<SymbolDirectoryEntry | null> {
  const database = getDatabase()
  const result = await sql<SymbolDirectoryRow>`
    SELECT
      symbol,
      name,
      exchange,
      "exchangeShortName",
      type,
      currency,
      sector,
      industry,
      country,
      "isActivelyTrading",
      "isEtf",
      "updatedAt"
    FROM symbol_directory
    WHERE symbol = ${symbol.trim().toUpperCase()}
    LIMIT 1
  `.execute(database)

  const row = result.rows[0]
  return row ? mapSymbolDirectoryRow(row) : null
}

export async function getCachedMarketPayload<T>(
  cacheKey: string
): Promise<T | undefined> {
  const database = getDatabase()
  const result = await sql<CacheRow>`
    SELECT payload, "expiresAt"
    FROM market_cache_entries
    WHERE id = ${cacheKey}
      AND "expiresAt" > NOW()
    LIMIT 1
  `.execute(database)

  const row = result.rows[0]

  if (!row) {
    return undefined
  }

  return row.payload as T
}

export async function setCachedMarketPayload(params: {
  cacheKey: string
  category: string
  payload: unknown
  ttlSeconds: number
}): Promise<void> {
  const database = getDatabase()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + params.ttlSeconds * 1000)

  await sql`
    INSERT INTO market_cache_entries (
      id,
      category,
      payload,
      "createdAt",
      "updatedAt",
      "expiresAt"
    )
    VALUES (
      ${params.cacheKey},
      ${params.category},
      CAST(${JSON.stringify(params.payload)} AS jsonb),
      ${now},
      ${now},
      ${expiresAt}
    )
    ON CONFLICT (id)
    DO UPDATE SET
      category = EXCLUDED.category,
      payload = EXCLUDED.payload,
      "updatedAt" = EXCLUDED."updatedAt",
      "expiresAt" = EXCLUDED."expiresAt"
  `.execute(database)
}

export async function recordMarketApiUsage(provider: string): Promise<void> {
  const database = getDatabase()

  await sql`
    INSERT INTO market_api_usage_daily (
      provider,
      day,
      count,
      "updatedAt"
    )
    VALUES (
      ${provider},
      CURRENT_DATE,
      1,
      NOW()
    )
    ON CONFLICT (provider, day)
    DO UPDATE SET
      count = market_api_usage_daily.count + 1,
      "updatedAt" = NOW()
  `
    .execute(database)
    .catch((error: unknown) => {
      if (isUndefinedTableError(error)) {
        return
      }

      throw error
    })

  await sql`
    INSERT INTO market_api_usage_minute (
      provider,
      bucket,
      count,
      "updatedAt"
    )
    VALUES (
      ${provider},
      DATE_TRUNC('minute', NOW()),
      1,
      NOW()
    )
    ON CONFLICT (provider, bucket)
    DO UPDATE SET
      count = market_api_usage_minute.count + 1,
      "updatedAt" = NOW()
  `
    .execute(database)
    .catch((error: unknown) => {
      if (isUndefinedTableError(error)) {
        return
      }

      throw error
    })
}

export async function getMarketApiUsageForToday(
  provider: string
): Promise<number> {
  const database = getDatabase()
  const result = await sql<{ count: number }>`
    SELECT count
    FROM market_api_usage_daily
    WHERE provider = ${provider}
      AND day = CURRENT_DATE
    LIMIT 1
  `.execute(database)

  return result.rows[0]?.count ?? 0
}

export async function getMarketApiUsageForCurrentMinute(
  provider: string
): Promise<number> {
  const database = getDatabase()
  const result = await sql<{ count: number }>`
    SELECT count
    FROM market_api_usage_minute
    WHERE provider = ${provider}
      AND bucket = DATE_TRUNC('minute', NOW())
    LIMIT 1
  `.execute(database)

  return result.rows[0]?.count ?? 0
}

export async function listSavedScreenersForUser(
  userId: string
): Promise<SavedScreenerRecord[]> {
  const database = getDatabase()
  const result = await sql<SavedScreenRow>`
    SELECT
      id,
      name,
      filters,
      "createdAt",
      "updatedAt"
    FROM saved_screens
    WHERE "userId" = ${userId}
    ORDER BY "updatedAt" DESC, id ASC
  `.execute(database)

  return result.rows.map(mapSavedScreenRow)
}

export async function upsertSavedScreenerForUser(params: {
  userId: string
  id?: string
  name: string
  filters: ScreenerFilterState
}): Promise<SavedScreenerRecord> {
  const database = getDatabase()
  const id = params.id ?? crypto.randomUUID()
  const now = new Date()

  await sql`
    INSERT INTO saved_screens (
      "userId",
      id,
      name,
      filters,
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${params.userId},
      ${id},
      ${params.name.trim()},
      CAST(${JSON.stringify(params.filters)} AS jsonb),
      ${now},
      ${now}
    )
    ON CONFLICT ("userId", id)
    DO UPDATE SET
      name = EXCLUDED.name,
      filters = EXCLUDED.filters,
      "updatedAt" = EXCLUDED."updatedAt"
  `.execute(database)

  const result = await sql<SavedScreenRow>`
    SELECT
      id,
      name,
      filters,
      "createdAt",
      "updatedAt"
    FROM saved_screens
    WHERE "userId" = ${params.userId}
      AND id = ${id}
    LIMIT 1
  `.execute(database)

  const row = result.rows[0]

  if (!row) {
    throw new Error("Failed to save screener.")
  }

  return mapSavedScreenRow(row)
}

export async function deleteSavedScreenerForUser(
  userId: string,
  screenerId: string
): Promise<void> {
  const database = getDatabase()

  await sql`
    DELETE FROM saved_screens
    WHERE "userId" = ${userId}
      AND id = ${screenerId}
  `.execute(database)
}
