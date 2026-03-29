import "server-only"

import { sql } from "kysely"

import type {
  SavedScreenerRecord,
  ScreenerFilterState,
} from "@/lib/shared/markets/workspace"

import { getDatabase } from "../postgres"
import { mapSavedScreenRow, type SavedScreenRow } from "./store-support"

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
