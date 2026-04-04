import "server-only"

export const POSTGRES_UNDEFINED_TABLE_ERROR_CODE = "42P01"
export const POSTGRES_UNIQUE_VIOLATION_ERROR_CODE = "23505"

export const MARKET_STORAGE_UNAVAILABLE_MESSAGE =
  "Market storage is not initialized. Run `pnpm markets:migrate`."

export class MarketStoreNotInitializedError extends Error {
  code = "market_storage_unavailable"

  constructor(message = MARKET_STORAGE_UNAVAILABLE_MESSAGE) {
    super(message)
    this.name = "MarketStoreNotInitializedError"
  }
}

export function isUndefinedTableError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === POSTGRES_UNDEFINED_TABLE_ERROR_CODE
  )
}

export function createMarketStoreNotInitializedError(): MarketStoreNotInitializedError {
  return new MarketStoreNotInitializedError()
}

export function isMarketStoreNotInitializedError(
  error: unknown
): error is MarketStoreNotInitializedError {
  return error instanceof MarketStoreNotInitializedError
}

export class PortfolioDuplicateSymbolError extends Error {
  code = "portfolio_duplicate_symbol"

  constructor(message = "Portfolio already includes this symbol.") {
    super(message)
    this.name = "PortfolioDuplicateSymbolError"
  }
}

export function isPortfolioDuplicateSymbolError(
  error: unknown
): error is PortfolioDuplicateSymbolError {
  return error instanceof PortfolioDuplicateSymbolError
}

export function isUniqueViolationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === POSTGRES_UNIQUE_VIOLATION_ERROR_CODE
  )
}
