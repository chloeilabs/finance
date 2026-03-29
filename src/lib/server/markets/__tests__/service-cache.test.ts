import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../config", async () => {
  const actual = (await vi.importActual("../config"))

  return {
    ...actual,
    getFmpSoftMinuteLimit: vi.fn(() => 10),
    isFmpConfigured: vi.fn(() => true),
  }
})

vi.mock("../store", async () => {
  const actual = (await vi.importActual("../store"))

  return {
    ...actual,
    getCachedMarketPayload: vi.fn(),
    getCachedMarketPayloadSnapshot: vi.fn(),
    getMarketApiUsageForCurrentMinute: vi.fn(),
    recordMarketApiUsage: vi.fn().mockResolvedValue(undefined),
    setCachedMarketPayload: vi.fn().mockResolvedValue(undefined),
  }
})

import { FmpRequestError } from "../client"
import * as config from "../config"
import { withMarketCache } from "../service"
import * as store from "../store"

describe("withMarketCache", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(config.isFmpConfigured).mockReturnValue(true)
    vi.mocked(config.getFmpSoftMinuteLimit).mockReturnValue(10)
    vi.mocked(store.getMarketApiUsageForCurrentMinute).mockResolvedValue(0)
    vi.mocked(store.getCachedMarketPayload).mockResolvedValue(undefined)
    vi.mocked(store.getCachedMarketPayloadSnapshot).mockResolvedValue(undefined)
    vi.mocked(store.setCachedMarketPayload).mockResolvedValue(undefined)
  })

  it("stores fresh live results after a successful fetch", async () => {
    const fetcher = vi.fn().mockResolvedValue({ source: "live" })

    await expect(
      withMarketCache({
        cacheKey: "quotes:AAPL",
        category: "quotes",
        ttlSeconds: 60,
        fallback: { source: "fallback" },
        fetcher,
      })
    ).resolves.toEqual({ source: "live" })

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(store.setCachedMarketPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: "quotes:AAPL",
        category: "quotes",
        payload: { source: "live" },
        ttlSeconds: 60,
      })
    )
  })

  it("returns expired cached data when a live refresh fails", async () => {
    vi.mocked(store.getCachedMarketPayloadSnapshot).mockResolvedValue({
      expiresAt: "2026-03-28T00:00:00.000Z",
      payload: { source: "stale" },
    })

    const fetcher = vi.fn().mockRejectedValue(
      new FmpRequestError({
        message: "FMP request timed out for /stable/quotes.",
        status: 504,
        code: "fmp_request_timeout",
        retryable: true,
      })
    )

    await expect(
      withMarketCache({
        cacheKey: "quotes:AAPL",
        category: "quotes",
        ttlSeconds: 60,
        fallback: { source: "fallback" },
        staleOnError: true,
        fetcher,
      })
    ).resolves.toEqual({ source: "stale" })

    expect(store.setCachedMarketPayload).not.toHaveBeenCalled()
  })
})
