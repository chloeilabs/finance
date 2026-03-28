import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"

declare global {
  var yuriePgPool: Pool | undefined
  var yurieDatabase: Kysely<Record<string, never>> | undefined
}

export const DATABASE_URL_ENV_NAME = "DATABASE_URL" as const

function getConfiguredDatabaseUrl(): string | null {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) {
    return null
  }

  return databaseUrl
}

function getRequiredDatabaseUrl(): string {
  const databaseUrl = getConfiguredDatabaseUrl()

  if (!databaseUrl) {
    throw new Error("Missing DATABASE_URL.")
  }

  return databaseUrl
}

function createPool() {
  return new Pool({
    connectionString: getRequiredDatabaseUrl(),
  })
}

function createDatabase(pool: Pool) {
  return new Kysely<Record<string, never>>({
    dialect: new PostgresDialect({ pool }),
  })
}

function isDatabaseConfigured(): boolean {
  return getConfiguredDatabaseUrl() !== null
}

function getDatabaseOrNull(): Kysely<Record<string, never>> | null {
  if (!isDatabaseConfigured()) {
    return null
  }

  const existingDatabase = globalThis.yurieDatabase
  if (existingDatabase) {
    return existingDatabase
  }

  const pgPool = globalThis.yuriePgPool ?? createPool()
  const database = createDatabase(pgPool)

  globalThis.yuriePgPool ??= pgPool
  globalThis.yurieDatabase ??= database

  return globalThis.yurieDatabase
}

export function getDatabase(): Kysely<Record<string, never>> {
  const database = getDatabaseOrNull()

  if (!database) {
    throw new Error("Missing DATABASE_URL.")
  }

  return database
}
