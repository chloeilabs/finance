import process from "node:process"

import { Client } from "pg"

const databaseUrl = process.env.DATABASE_URL?.trim()
const THREAD_STORAGE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS thread (
  "userId" text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
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
ADD COLUMN IF NOT EXISTS "isPinned" boolean NOT NULL DEFAULT false;

ALTER TABLE thread
ADD COLUMN IF NOT EXISTS metadata jsonb;

CREATE INDEX IF NOT EXISTS thread_user_updated_at_idx
ON thread ("userId", "updatedAt" DESC);
`

if (!databaseUrl) {
  console.error("Missing DATABASE_URL.")
  process.exit(1)
}

const client = new Client({
  connectionString: databaseUrl,
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
