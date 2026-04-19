import { Kysely, PostgresDialect } from "kysely"
import { Pool } from "pg"

declare global {
  var financePgPool: Pool | undefined
  var financeDatabase: Kysely<Record<string, never>> | undefined
  var financeAuthPgPool: Pool | undefined
  var financeAuthDatabase: Kysely<Record<string, never>> | undefined
}

export const DATABASE_URL_ENV_NAME = "DATABASE_URL" as const
export const AUTH_DATABASE_URL_ENV_NAME = "AUTH_DATABASE_URL" as const

type DatabaseUrlEnvName =
  | typeof DATABASE_URL_ENV_NAME
  | typeof AUTH_DATABASE_URL_ENV_NAME

const LEGACY_SSL_MODES = new Set(["prefer", "require", "verify-ca"])

function getConfiguredDatabaseUrl(name: DatabaseUrlEnvName): string | null {
  const databaseUrl = process.env[name]?.trim()
  if (!databaseUrl) {
    if (name === AUTH_DATABASE_URL_ENV_NAME) {
      return getConfiguredDatabaseUrl(DATABASE_URL_ENV_NAME)
    }

    return null
  }

  return databaseUrl
}

function getRequiredDatabaseUrl(name: DatabaseUrlEnvName): string {
  const databaseUrl = getConfiguredDatabaseUrl(name)

  if (!databaseUrl) {
    throw new Error(`Missing ${name}.`)
  }

  return databaseUrl
}

export function normalizeDatabaseConnectionString(
  connectionString: string
): string {
  const normalizedConnectionString = connectionString.trim()
  if (!normalizedConnectionString) {
    return normalizedConnectionString
  }

  let connectionUrl: URL

  try {
    connectionUrl = new URL(normalizedConnectionString)
  } catch {
    return normalizedConnectionString
  }

  const useLibpqCompat = connectionUrl.searchParams.get("uselibpqcompat")
  if (useLibpqCompat?.toLowerCase() === "true") {
    return normalizedConnectionString
  }

  const sslMode = connectionUrl.searchParams.get("sslmode")?.toLowerCase()
  if (!sslMode || !LEGACY_SSL_MODES.has(sslMode)) {
    return normalizedConnectionString
  }

  // pg currently treats these legacy modes as verify-full. Make that explicit
  // so builds and migrations keep the same behavior without the warning.
  connectionUrl.searchParams.set("sslmode", "verify-full")
  return connectionUrl.toString()
}

function createPool(connectionString: string) {
  return new Pool({
    connectionString: normalizeDatabaseConnectionString(connectionString),
  })
}

function createDatabase(pool: Pool) {
  return new Kysely<Record<string, never>>({
    dialect: new PostgresDialect({ pool }),
  })
}

function isDatabaseConfigured(name: DatabaseUrlEnvName): boolean {
  return getConfiguredDatabaseUrl(name) !== null
}

function getPrimaryDatabaseOrNull(): Kysely<Record<string, never>> | null {
  if (!isDatabaseConfigured(DATABASE_URL_ENV_NAME)) {
    return null
  }

  const existingDatabase = globalThis.financeDatabase
  if (existingDatabase) {
    return existingDatabase
  }

  const pgPool =
    globalThis.financePgPool ??
    createPool(getRequiredDatabaseUrl(DATABASE_URL_ENV_NAME))
  const database = createDatabase(pgPool)

  globalThis.financePgPool ??= pgPool
  globalThis.financeDatabase ??= database

  return globalThis.financeDatabase
}

export function getDatabase(): Kysely<Record<string, never>> {
  const database = getPrimaryDatabaseOrNull()

  if (!database) {
    throw new Error("Missing DATABASE_URL.")
  }

  return database
}

function getAuthDatabaseOrNull(): Kysely<Record<string, never>> | null {
  if (!isDatabaseConfigured(AUTH_DATABASE_URL_ENV_NAME)) {
    return null
  }

  const authDatabaseUrl = getRequiredDatabaseUrl(AUTH_DATABASE_URL_ENV_NAME)
  const primaryDatabaseUrl = getConfiguredDatabaseUrl(DATABASE_URL_ENV_NAME)

  if (authDatabaseUrl === primaryDatabaseUrl) {
    return getPrimaryDatabaseOrNull()
  }

  const existingDatabase = globalThis.financeAuthDatabase
  if (existingDatabase) {
    return existingDatabase
  }

  const pgPool =
    globalThis.financeAuthPgPool ?? createPool(authDatabaseUrl)
  const database = createDatabase(pgPool)

  globalThis.financeAuthPgPool ??= pgPool
  globalThis.financeAuthDatabase ??= database

  return globalThis.financeAuthDatabase
}

export function getAuthDatabase(): Kysely<Record<string, never>> {
  const database = getAuthDatabaseOrNull()

  if (!database) {
    throw new Error(
      `Missing ${AUTH_DATABASE_URL_ENV_NAME} or ${DATABASE_URL_ENV_NAME}.`
    )
  }

  return database
}
