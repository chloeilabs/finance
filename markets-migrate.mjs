import process from "node:process"

import { Client } from "pg"

const databaseUrl = process.env.DATABASE_URL?.trim()
const MARKET_STORAGE_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS symbol_directory (
  symbol text PRIMARY KEY,
  name text NOT NULL,
  exchange text,
  "exchangeShortName" text,
  type text,
  currency text,
  sector text,
  industry text,
  country text,
  "isActivelyTrading" boolean NOT NULL DEFAULT false,
  "isEtf" boolean NOT NULL DEFAULT false,
  "updatedAt" timestamp(3) without time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS symbol_directory_name_idx
ON symbol_directory (name);

CREATE TABLE IF NOT EXISTS watchlist (
  "userId" text NOT NULL,
  id text NOT NULL,
  name text NOT NULL,
  symbols jsonb NOT NULL DEFAULT '[]'::jsonb,
  "createdAt" timestamp(3) without time zone NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  PRIMARY KEY ("userId", id)
);

CREATE INDEX IF NOT EXISTS watchlist_user_updated_at_idx
ON watchlist ("userId", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS watchlist_items (
  "userId" text NOT NULL,
  "watchlistId" text NOT NULL,
  symbol text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  "createdAt" timestamp(3) without time zone NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  PRIMARY KEY ("userId", "watchlistId", symbol),
  CONSTRAINT watchlist_items_watchlist_fk
    FOREIGN KEY ("userId", "watchlistId")
    REFERENCES watchlist ("userId", id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS watchlist_items_lookup_idx
ON watchlist_items ("userId", "watchlistId", position ASC);

CREATE TABLE IF NOT EXISTS saved_screens (
  "userId" text NOT NULL,
  id text NOT NULL,
  name text NOT NULL,
  filters jsonb NOT NULL DEFAULT '{}'::jsonb,
  "createdAt" timestamp(3) without time zone NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  PRIMARY KEY ("userId", id)
);

CREATE INDEX IF NOT EXISTS saved_screens_user_updated_at_idx
ON saved_screens ("userId", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS market_cache_entries (
  id text PRIMARY KEY,
  category text NOT NULL,
  payload jsonb NOT NULL,
  "createdAt" timestamp(3) without time zone NOT NULL,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  "expiresAt" timestamp(3) without time zone NOT NULL
);

CREATE INDEX IF NOT EXISTS market_cache_entries_category_idx
ON market_cache_entries (category, "expiresAt" DESC);

CREATE TABLE IF NOT EXISTS market_api_usage_daily (
  provider text NOT NULL,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  PRIMARY KEY (provider, day)
);

CREATE TABLE IF NOT EXISTS market_api_usage_minute (
  provider text NOT NULL,
  bucket timestamp(0) without time zone NOT NULL,
  count integer NOT NULL DEFAULT 0,
  "updatedAt" timestamp(3) without time zone NOT NULL,
  PRIMARY KEY (provider, bucket)
);

CREATE INDEX IF NOT EXISTS market_api_usage_minute_updated_at_idx
ON market_api_usage_minute (provider, "updatedAt" DESC);

-- Shared auth may live in a separate database, so market data cannot depend on
-- a local Better Auth "user" table.
ALTER TABLE IF EXISTS watchlist
DROP CONSTRAINT IF EXISTS watchlist_userId_fkey;

ALTER TABLE IF EXISTS watchlist_items
DROP CONSTRAINT IF EXISTS watchlist_items_userId_fkey;

ALTER TABLE IF EXISTS saved_screens
DROP CONSTRAINT IF EXISTS saved_screens_userId_fkey;
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
  await client.query(MARKET_STORAGE_SCHEMA_SQL)
  await client.query("COMMIT")
  console.log("Applied market storage schema.")
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined)
  throw error
} finally {
  await client.end()
}
