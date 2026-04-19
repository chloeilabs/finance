import { describe, expect, it } from "vitest"

import { normalizeDatabaseConnectionString } from "../postgres"

describe("normalizeDatabaseConnectionString", () => {
  it("upgrades legacy sslmode=require to verify-full", () => {
    expect(
      normalizeDatabaseConnectionString(
        "postgresql://user:pass@example.com/db?sslmode=require"
      )
    ).toBe(
      "postgresql://user:pass@example.com/db?sslmode=verify-full"
    )
  })

  it("keeps connection strings with explicit libpq compatibility", () => {
    expect(
      normalizeDatabaseConnectionString(
        "postgresql://user:pass@example.com/db?uselibpqcompat=true&sslmode=require"
      )
    ).toBe(
      "postgresql://user:pass@example.com/db?uselibpqcompat=true&sslmode=require"
    )
  })

  it("leaves non-legacy sslmode values unchanged", () => {
    expect(
      normalizeDatabaseConnectionString(
        "postgresql://user:pass@example.com/db?sslmode=verify-full"
      )
    ).toBe(
      "postgresql://user:pass@example.com/db?sslmode=verify-full"
    )
  })

  it("leaves connection strings without sslmode unchanged", () => {
    expect(
      normalizeDatabaseConnectionString(
        "postgresql://user:pass@example.com/db"
      )
    ).toBe("postgresql://user:pass@example.com/db")
  })
})
