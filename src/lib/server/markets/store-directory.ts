import "server-only"

import { sql } from "kysely"

import type { SymbolDirectoryEntry } from "@/lib/shared/markets/core"

import { getDatabase } from "../postgres"
import {
  chunkArray,
  mapSymbolDirectoryRow,
  type SymbolDirectoryRow,
} from "./store-support"

export async function upsertSymbolDirectoryEntries(
  entries: SymbolDirectoryEntry[]
): Promise<void> {
  if (entries.length === 0) {
    return
  }

  const database = getDatabase()

  for (const batch of chunkArray(entries, 250)) {
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
      VALUES ${sql.join(
        batch.map(
          (entry) => sql`(
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
          )`
        )
      )}
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
