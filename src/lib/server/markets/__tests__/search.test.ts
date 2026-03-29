import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../store", async () => {
  const actual = (await vi.importActual("../store"))

  return {
    ...actual,
    getCachedMarketPayload: vi.fn(),
    getCachedMarketPayloadSnapshot: vi.fn(),
    getMarketApiUsageForCurrentMinute: vi.fn(),
    recordMarketApiUsage: vi.fn().mockResolvedValue(undefined),
    searchSymbolDirectory: vi.fn(),
    setCachedMarketPayload: vi.fn().mockResolvedValue(undefined),
    upsertSymbolDirectoryEntries: vi.fn().mockResolvedValue(undefined),
  }
})

import { POSTGRES_UNDEFINED_TABLE_ERROR_CODE } from "../errors"
import { searchMarketSymbols } from "../service"
import * as store from "../store"

function toFetchUrl(input: Parameters<typeof fetch>[0]) {
  if (typeof input === "string") {
    return input
  }

  if (input instanceof URL) {
    return input.toString()
  }

  return input.url
}

describe("searchMarketSymbols", () => {
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.FMP_API_KEY
  const originalBaseUrl = process.env.FMP_BASE_URL

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FMP_API_KEY = "test-key"
    process.env.FMP_BASE_URL = "https://example.test"
    vi.mocked(store.getCachedMarketPayload).mockResolvedValue(undefined)
    vi.mocked(store.getCachedMarketPayloadSnapshot).mockResolvedValue(undefined)
    vi.mocked(store.getMarketApiUsageForCurrentMinute).mockResolvedValue(0)
    vi.mocked(store.searchSymbolDirectory).mockResolvedValue([])
    vi.mocked(store.setCachedMarketPayload).mockResolvedValue(undefined)
    vi.mocked(store.upsertSymbolDirectoryEntries).mockResolvedValue(undefined)
    globalThis.fetch = vi.fn().mockImplementation(() => {
      return new Response(
        JSON.stringify([
          {
            symbol: "AAPL",
            name: "Apple Inc.",
            exchange: "NASDAQ",
            exchangeShortName: "NASDAQ",
            type: "stock",
          },
        ]),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        }
      )
    }) as typeof fetch
  })

  afterEach(() => {
    globalThis.fetch = originalFetch

    if (originalApiKey === undefined) {
      delete process.env.FMP_API_KEY
    } else {
      process.env.FMP_API_KEY = originalApiKey
    }

    if (originalBaseUrl === undefined) {
      delete process.env.FMP_BASE_URL
    } else {
      process.env.FMP_BASE_URL = originalBaseUrl
    }
  })

  it("falls back to live search without fetching the full directory", async () => {
    const results = await searchMarketSymbols("AAPL")

    expect(results).toEqual([
      expect.objectContaining({
        exchange: "NASDAQ",
        exchangeShortName: "NASDAQ",
        name: "Apple Inc.",
        symbol: "AAPL",
        type: "stock",
      }),
    ])
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)

    const calledUrls = vi
      .mocked(globalThis.fetch)
      .mock.calls.map(([url]) => toFetchUrl(url))
    expect(calledUrls).toHaveLength(2)
    expect(calledUrls.every((url) => !url.includes("/stock/list"))).toBe(true)
    expect(calledUrls.every((url) => !url.includes("/etf/list"))).toBe(true)

    await vi.waitFor(() => {
      expect(store.upsertSymbolDirectoryEntries).toHaveBeenCalledWith([
        expect.objectContaining({
          exchange: "NASDAQ",
          exchangeShortName: "NASDAQ",
          name: "Apple Inc.",
          symbol: "AAPL",
        }),
      ])
    })
  })

  it("still returns live results when symbol tables are missing", async () => {
    vi.mocked(store.searchSymbolDirectory).mockRejectedValue({
      code: POSTGRES_UNDEFINED_TABLE_ERROR_CODE,
    })
    vi.mocked(store.upsertSymbolDirectoryEntries).mockRejectedValue({
      code: POSTGRES_UNDEFINED_TABLE_ERROR_CODE,
    })

    await expect(searchMarketSymbols("AAPL")).resolves.toEqual([
      expect.objectContaining({
        name: "Apple Inc.",
        symbol: "AAPL",
      }),
    ])
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})
