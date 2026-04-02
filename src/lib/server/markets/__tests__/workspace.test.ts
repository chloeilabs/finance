import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../config", async () => {
  const actual = await vi.importActual("../config")

  return {
    ...actual,
    getFmpPlanValidationSummary: vi.fn(() => ({
      accessibleDatasets: ["quote"],
      accessibleProbes: ["quote"],
      restrictedDatasets: [],
      restrictedProbes: [],
      source: "test",
      tier: "STARTER",
      validatedAt: "2026-03-29T00:00:00.000Z",
    })),
    getMarketPlanSummary: vi.fn(() => ({
      bandwidthLimitLabel: "test",
      capabilities: {},
      historicalRangeLabel: "test",
      label: "Starter",
      quoteFreshnessLabel: "test",
      requestBudgetLabel: "test",
      tier: "STARTER",
      watchlistLimit: 75,
    })),
    isFmpConfigured: vi.fn(() => true),
  }
})

vi.mock("../store", async () => {
  const actual = await vi.importActual("../store")

  return {
    ...actual,
    ensureDefaultWatchlistForUser: vi.fn(),
    listSavedScreenersForUser: vi.fn(),
    listWatchlistsForUser: vi.fn(),
    replaceWatchlistSymbols: vi.fn(),
  }
})

import { CORE_WATCHLIST_SYMBOLS } from "../service-support"
import * as store from "../store"
import { getMarketSidebarData } from "../workspace"

const LEGACY_CORE_WATCHLIST_SYMBOLS = CORE_WATCHLIST_SYMBOLS.filter(
  (symbol) => symbol !== "AVGO"
)
const PREVIOUS_CORE_WATCHLIST_SYMBOL_ORDER = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AVGO",
  "AMZN",
  "META",
  "TSLA",
  "GOOGL",
  "BRK.B",
]

function createWatchlist(symbols: string[]) {
  return {
    createdAt: "2026-03-28T00:00:00.000Z",
    id: "core",
    name: "Core",
    symbols,
    updatedAt: "2026-03-28T00:00:00.000Z",
  }
}

describe("getMarketSidebarData", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("seeds the default core watchlist with AVGO", async () => {
    vi.mocked(store.listWatchlistsForUser).mockResolvedValue([])
    vi.mocked(store.ensureDefaultWatchlistForUser).mockResolvedValue(
      createWatchlist([...CORE_WATCHLIST_SYMBOLS])
    )

    const result = await getMarketSidebarData("user_123")

    expect(store.ensureDefaultWatchlistForUser).toHaveBeenCalledWith(
      "user_123",
      [...CORE_WATCHLIST_SYMBOLS]
    )
    expect(result.watchlists[0]?.symbols).toContain("AVGO")
  })

  it("upgrades the untouched legacy core watchlist to include AVGO", async () => {
    vi.mocked(store.listWatchlistsForUser)
      .mockResolvedValueOnce([createWatchlist([...LEGACY_CORE_WATCHLIST_SYMBOLS])])
      .mockResolvedValueOnce([createWatchlist([...CORE_WATCHLIST_SYMBOLS])])
    vi.mocked(store.replaceWatchlistSymbols).mockResolvedValue(
      createWatchlist([...CORE_WATCHLIST_SYMBOLS])
    )

    const result = await getMarketSidebarData("user_123")

    expect(store.replaceWatchlistSymbols).toHaveBeenCalledWith({
      symbols: [...CORE_WATCHLIST_SYMBOLS],
      userId: "user_123",
      watchlistId: "core",
    })
    expect(result.watchlists[0]?.symbols).toEqual([...CORE_WATCHLIST_SYMBOLS])
  })

  it("reorders the untouched core watchlist to current market-cap order", async () => {
    vi.mocked(store.listWatchlistsForUser)
      .mockResolvedValueOnce([createWatchlist([...PREVIOUS_CORE_WATCHLIST_SYMBOL_ORDER])])
      .mockResolvedValueOnce([createWatchlist([...CORE_WATCHLIST_SYMBOLS])])
    vi.mocked(store.replaceWatchlistSymbols).mockResolvedValue(
      createWatchlist([...CORE_WATCHLIST_SYMBOLS])
    )

    const result = await getMarketSidebarData("user_123")

    expect(store.replaceWatchlistSymbols).toHaveBeenCalledWith({
      symbols: [...CORE_WATCHLIST_SYMBOLS],
      userId: "user_123",
      watchlistId: "core",
    })
    expect(result.watchlists[0]?.symbols).toEqual([...CORE_WATCHLIST_SYMBOLS])
  })
})
