import "server-only"

import { sql } from "kysely"

import { getDatabase } from "../postgres"
import { isUndefinedTableError } from "./errors"
import {
  type CachedMarketPayloadSnapshot,
  type CacheRow,
  toIsoString,
} from "./store-support"

export type { CachedMarketPayloadSnapshot } from "./store-support"

export async function getCachedMarketPayloadSnapshot<T>(
  cacheKey: string,
  options?: { includeExpired?: boolean }
): Promise<CachedMarketPayloadSnapshot<T> | undefined> {
  const database = getDatabase()
  const result = await sql<CacheRow>`
    SELECT payload, "expiresAt"
    FROM market_cache_entries
    WHERE id = ${cacheKey}
    ${options?.includeExpired ? sql`` : sql`AND "expiresAt" > NOW()`}
    LIMIT 1
  `.execute(database)

  const row = result.rows[0]

  if (!row) {
    return undefined
  }

  return {
    payload: row.payload as T,
    expiresAt: toIsoString(row.expiresAt),
  }
}

export async function getCachedMarketPayload<T>(
  cacheKey: string
): Promise<T | undefined> {
  return (await getCachedMarketPayloadSnapshot<T>(cacheKey))?.payload
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
