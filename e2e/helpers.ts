import { existsSync, readFileSync } from "node:fs"
import { mkdir, rm } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { Client } from "pg"

export interface E2EAuthUser {
  email: string
  name: string
  password: string
}

const rootDir = fileURLToPath(new URL("../", import.meta.url))
const artifactsDir = path.join(rootDir, ".artifacts", "playwright")
const envPaths = [path.join(rootDir, ".env.local"), path.join(rootDir, ".env")]
const POSTGRES_UNDEFINED_TABLE_ERROR_CODE = "42P01"

let cachedFileEnv: Record<string, string> | null = null

function parseEnvFile(filePath: string): Record<string, string> {
  const content = readFileSync(filePath, "utf8")
  const entries: Record<string, string> = {}

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) {
      continue
    }

    const separatorIndex = line.indexOf("=")
    if (separatorIndex === -1) {
      continue
    }

    const key = line.slice(0, separatorIndex).trim()
    const value = line.slice(separatorIndex + 1)
    if (key) {
      entries[key] = value
    }
  }

  return entries
}

function getFileEnv(): Record<string, string> {
  if (cachedFileEnv) {
    return cachedFileEnv
  }

  cachedFileEnv = {}

  for (const filePath of envPaths) {
    if (!existsSync(filePath)) {
      continue
    }

    Object.assign(cachedFileEnv, parseEnvFile(filePath))
  }

  return cachedFileEnv
}

export function getEnv(name: string): string | undefined {
  const runtimeValue = process.env[name]?.trim()
  if (runtimeValue) {
    return runtimeValue
  }

  const fileValue = getFileEnv()[name]?.trim()
  return fileValue === "" ? undefined : fileValue
}

function getRequiredEnv(name: string): string {
  const value = getEnv(name)
  if (!value) {
    throw new Error(`Missing ${name}. Set it in the shell or .env.local.`)
  }

  return value
}

function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === POSTGRES_UNDEFINED_TABLE_ERROR_CODE
  )
}

async function runWithClient<T>(
  connectionString: string,
  fn: (client: Client) => Promise<T>
): Promise<T> {
  const client = new Client({ connectionString })
  await client.connect()

  try {
    return await fn(client)
  } finally {
    await client.end().catch(() => undefined)
  }
}

async function deleteAppDataForUser(userId: string) {
  const connectionString = getRequiredEnv("DATABASE_URL")

  await runWithClient(connectionString, async (client) => {
    await client.query("BEGIN")

    try {
      await client.query('delete from thread where "userId" = $1', [userId])
      await client.query('delete from watchlist_items where "userId" = $1', [
        userId,
      ])
      await client.query('delete from watchlist where "userId" = $1', [userId])
      await client.query('delete from saved_screens where "userId" = $1', [
        userId,
      ])
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined)
      if (isUndefinedTableError(error)) {
        return
      }

      throw error
    }
  })
}

async function deleteAuthDataForUser(userId: string, email: string) {
  const connectionString =
    getEnv("AUTH_DATABASE_URL") ?? getRequiredEnv("DATABASE_URL")

  await runWithClient(connectionString, async (client) => {
    await client.query("BEGIN")

    try {
      await client.query('delete from session where "userId" = $1', [userId])
      await client.query('delete from account where "userId" = $1', [userId])
      await client.query("delete from verification where identifier = $1", [
        email,
      ])
      await client.query('delete from "user" where id = $1', [userId])
      await client.query("COMMIT")
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined)
      throw error
    }
  })
}

export function createE2EAuthUser(label: string): E2EAuthUser {
  const normalizedLabel = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 24)
  const uniqueSuffix = `${String(Date.now())}-${Math.random()
    .toString(36)
    .slice(2, 8)}`

  return {
    email: `codex-e2e-${normalizedLabel}-${uniqueSuffix}@example.com`,
    name: "Codex E2E",
    password: "SmokeTest123!",
  }
}

export async function createStorageStatePath(
  fileName: string
): Promise<string> {
  await mkdir(artifactsDir, { recursive: true })
  return path.join(artifactsDir, fileName)
}

export async function deleteStorageState(pathToDelete: string): Promise<void> {
  await rm(pathToDelete, { force: true }).catch(() => undefined)
}

export async function cleanupTestUser(email: string): Promise<void> {
  const authConnectionString =
    getEnv("AUTH_DATABASE_URL") ?? getRequiredEnv("DATABASE_URL")

  const userId = await runWithClient(authConnectionString, async (client) => {
    const result = await client.query<{ id: string }>(
      'select id from "user" where email = $1',
      [email]
    )

    return result.rows[0]?.id
  })

  if (!userId) {
    return
  }

  await deleteAppDataForUser(userId)
  await deleteAuthDataForUser(userId, email)
}
