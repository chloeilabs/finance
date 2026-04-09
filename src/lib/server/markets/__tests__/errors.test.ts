import { describe, expect, it } from "vitest"

import {
  createMarketStoreNotInitializedError,
  isMarketStoreNotInitializedError,
  isPortfolioDuplicateSymbolError,
  isUndefinedTableError,
  isUniqueViolationError,
  MARKET_STORAGE_UNAVAILABLE_MESSAGE,
  MarketStoreNotInitializedError,
  PortfolioDuplicateSymbolError,
  POSTGRES_UNDEFINED_TABLE_ERROR_CODE,
  POSTGRES_UNIQUE_VIOLATION_ERROR_CODE,
} from "../errors"

describe("MarketStoreNotInitializedError", () => {
  it("has the correct name", () => {
    const error = new MarketStoreNotInitializedError()
    expect(error.name).toBe("MarketStoreNotInitializedError")
  })

  it("has the correct code", () => {
    const error = new MarketStoreNotInitializedError()
    expect(error.code).toBe("market_storage_unavailable")
  })

  it("uses the default message", () => {
    const error = new MarketStoreNotInitializedError()
    expect(error.message).toBe(MARKET_STORAGE_UNAVAILABLE_MESSAGE)
  })

  it("accepts a custom message", () => {
    const error = new MarketStoreNotInitializedError("custom")
    expect(error.message).toBe("custom")
  })

  it("is an instance of Error", () => {
    const error = new MarketStoreNotInitializedError()
    expect(error).toBeInstanceOf(Error)
  })
})

describe("PortfolioDuplicateSymbolError", () => {
  it("has the correct name and code", () => {
    const error = new PortfolioDuplicateSymbolError()
    expect(error.name).toBe("PortfolioDuplicateSymbolError")
    expect(error.code).toBe("portfolio_duplicate_symbol")
  })

  it("uses the default message", () => {
    const error = new PortfolioDuplicateSymbolError()
    expect(error.message).toBe("Portfolio already includes this symbol.")
  })

  it("accepts a custom message", () => {
    const error = new PortfolioDuplicateSymbolError("dup")
    expect(error.message).toBe("dup")
  })
})

describe("createMarketStoreNotInitializedError", () => {
  it("returns a MarketStoreNotInitializedError", () => {
    const error = createMarketStoreNotInitializedError()
    expect(error).toBeInstanceOf(MarketStoreNotInitializedError)
  })
})

describe("isMarketStoreNotInitializedError", () => {
  it("returns true for MarketStoreNotInitializedError instances", () => {
    expect(
      isMarketStoreNotInitializedError(new MarketStoreNotInitializedError())
    ).toBe(true)
  })

  it("returns false for generic errors", () => {
    expect(isMarketStoreNotInitializedError(new Error("nope"))).toBe(false)
  })
})

describe("isPortfolioDuplicateSymbolError", () => {
  it("returns true for PortfolioDuplicateSymbolError instances", () => {
    expect(
      isPortfolioDuplicateSymbolError(new PortfolioDuplicateSymbolError())
    ).toBe(true)
  })

  it("returns false for generic errors", () => {
    expect(isPortfolioDuplicateSymbolError(new Error("nope"))).toBe(false)
  })
})

describe("isUndefinedTableError", () => {
  it("returns true for an object with the postgres undefined table code", () => {
    expect(
      isUndefinedTableError({ code: POSTGRES_UNDEFINED_TABLE_ERROR_CODE })
    ).toBe(true)
  })

  it("returns false for a different code", () => {
    expect(isUndefinedTableError({ code: "23505" })).toBe(false)
  })

  it("returns false for null", () => {
    expect(isUndefinedTableError(null)).toBe(false)
  })

  it("returns false for a string", () => {
    expect(isUndefinedTableError("42P01")).toBe(false)
  })
})

describe("isUniqueViolationError", () => {
  it("returns true for an object with the unique violation code", () => {
    expect(
      isUniqueViolationError({ code: POSTGRES_UNIQUE_VIOLATION_ERROR_CODE })
    ).toBe(true)
  })

  it("returns false for a different code", () => {
    expect(isUniqueViolationError({ code: "42P01" })).toBe(false)
  })

  it("returns false for null", () => {
    expect(isUniqueViolationError(null)).toBe(false)
  })
})
