import process from "node:process"

import { Client } from "pg"

const databaseUrl = process.env.DATABASE_URL?.trim()
const DEFAULT_THREAD_TITLE = "New Thread"
const LEGACY_SSL_MODES = new Set(["prefer", "require", "verify-ca"])
const THREAD_STORAGE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS thread (
  "userId" text NOT NULL,
  id text NOT NULL,
  title text NOT NULL,
  model text,
  "isPinned" boolean NOT NULL DEFAULT false,
  metadata jsonb,
  messages jsonb NOT NULL,
  "createdAt" timestamp(3) without time zone NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  PRIMARY KEY ("userId", id)
);

ALTER TABLE thread
ADD COLUMN IF NOT EXISTS title text;

UPDATE thread
SET title = COALESCE(
  NULLIF(LEFT(TRIM(COALESCE(messages -> 0 ->> 'content', '')), 500), ''),
  '${DEFAULT_THREAD_TITLE}'
)
WHERE title IS NULL;

ALTER TABLE thread
ALTER COLUMN title SET NOT NULL;

ALTER TABLE thread
ADD COLUMN IF NOT EXISTS "isPinned" boolean NOT NULL DEFAULT false;

ALTER TABLE thread
ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS thread_user_updated_at_idx
ON thread ("userId", "updatedAt" DESC);

-- Shared auth may live in a separate database, so thread storage cannot depend
-- on a local Better Auth "user" table.
ALTER TABLE IF EXISTS thread
DROP CONSTRAINT IF EXISTS "thread_userId_fkey";
`

function normalizeDatabaseConnectionString(connectionString) {
  const normalizedConnectionString = connectionString.trim()
  if (!normalizedConnectionString) {
    return normalizedConnectionString
  }

  let connectionUrl

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

  connectionUrl.searchParams.set("sslmode", "verify-full")
  return connectionUrl.toString()
}

if (!databaseUrl) {
  console.error("Missing DATABASE_URL.")
  process.exit(1)
}

const client = new Client({
  connectionString: normalizeDatabaseConnectionString(databaseUrl),
})

await client.connect()

try {
  await client.query("BEGIN")
  await client.query(THREAD_STORAGE_SCHEMA_SQL)
  await client.query("COMMIT")
  console.log("Applied thread storage schema.")
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined)
  throw error
} finally {
  await client.end()
}
