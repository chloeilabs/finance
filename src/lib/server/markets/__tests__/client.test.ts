import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../store", async () => {
  const actual = (await vi.importActual("../store"))

  return {
    ...actual,
    recordMarketApiUsage: vi.fn().mockResolvedValue(undefined),
  }
})

import { fetchFmpJson } from "../client"
import * as store from "../store"

describe("fetchFmpJson", () => {
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.FMP_API_KEY
  const originalBaseUrl = process.env.FMP_BASE_URL

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FMP_API_KEY = "test-key"
    process.env.FMP_BASE_URL = "https://example.test"
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

  it("returns JSON for successful requests", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      })
    ) as typeof fetch

    await expect(
      fetchFmpJson("/stable/quotes", { symbol: "AAPL" }, { retries: 0 })
    ).resolves.toEqual({ ok: true })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://example.test/stable/quotes?symbol=AAPL&apikey=test-key",
      expect.objectContaining({
        cache: "no-store",
        headers: {
          Accept: "application/json",
        },
      })
    )
    expect(store.recordMarketApiUsage).toHaveBeenCalledWith("fmp")
  })

  it("raises a restricted endpoint error for 402 responses", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "restricted" }), {
        status: 402,
        headers: {
          "Content-Type": "application/json",
        },
      })
    ) as typeof fetch

    await expect(
      fetchFmpJson("/stable/restricted", {}, { retries: 0 })
    ).rejects.toMatchObject({
      code: "fmp_endpoint_restricted",
      status: 402,
    })
  })

  it("raises a timeout error for aborted requests", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(
        new DOMException("Timed out", "AbortError")
      ) as typeof fetch

    await expect(
      fetchFmpJson("/stable/timeout", {}, { retries: 0 })
    ).rejects.toMatchObject({
      code: "fmp_request_timeout",
      status: 504,
    })
  })

  it("raises a network error for transport failures", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(new TypeError("network down")) as typeof fetch

    await expect(
      fetchFmpJson("/stable/network", {}, { retries: 0 })
    ).rejects.toMatchObject({
      code: "fmp_network_error",
      status: 503,
    })
  })

  it("raises a data error when FMP returns an Error Message on 200", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ "Error Message": "Limit Reach" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    ) as typeof fetch

    await expect(
      fetchFmpJson("/stable/quote", { symbol: "AAPL" }, { retries: 0 })
    ).rejects.toMatchObject({
      code: "fmp_data_error",
      status: 200,
    })
  })

  it("treats an empty response body as an empty array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("", { status: 200 })
    ) as typeof fetch

    await expect(
      fetchFmpJson("/stable/quote", { symbol: "AAPL" }, { retries: 0 })
    ).resolves.toEqual([])
  })

  it("treats a whitespace-only response body as an empty array", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("   \n  ", { status: 200 })
    ) as typeof fetch

    await expect(
      fetchFmpJson("/stable/quote", { symbol: "AAPL" }, { retries: 0 })
    ).resolves.toEqual([])
  })

  it("respects Retry-After header on 429 responses", async () => {
    let callCount = 0
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount += 1
      if (callCount === 1) {
        return Promise.resolve(
          new Response("", {
            status: 429,
            headers: { "Retry-After": "1" },
          })
        )
      }
      return Promise.resolve(
        new Response(JSON.stringify([{ ok: true }]), { status: 200 })
      )
    }) as typeof fetch

    const result = await fetchFmpJson(
      "/stable/quote",
      { symbol: "AAPL" },
      { retries: 1 }
    )

    expect(result).toEqual([{ ok: true }])
    expect(globalThis.fetch).toHaveBeenCalledTimes(2)
  })
})
