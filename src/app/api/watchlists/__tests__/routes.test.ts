import { beforeEach, describe, expect, it, vi } from "vitest"

import { MarketStoreNotInitializedError } from "@/lib/server/markets/errors"

vi.mock("@/lib/server/auth", () => ({
  createAuthUnavailableResponse: vi.fn(
    (headers?: HeadersInit) =>
      new Response(JSON.stringify({ error: "Auth unavailable." }), {
        status: 503,
        headers,
      })
  ),
  isAuthConfigured: vi.fn(() => true),
}))

vi.mock("@/lib/server/auth-session", () => ({
  getRequestSession: vi.fn(),
}))

vi.mock("@/lib/server/markets/service", () => ({
  createNewWatchlistForUser: vi.fn(),
  getMarketSidebarData: vi.fn(),
  getWatchlistPageData: vi.fn(),
  primeQuoteCacheForSymbols: vi.fn().mockResolvedValue([]),
  updateWatchlistSymbolsForUser: vi.fn(),
}))

import { getRequestSession } from "@/lib/server/auth-session"
import {
  createNewWatchlistForUser,
  getMarketSidebarData,
  getWatchlistPageData,
  updateWatchlistSymbolsForUser,
} from "@/lib/server/markets/service"

import { GET as getWatchlist, PATCH as patchWatchlist } from "../[id]/route"
import { GET as getWatchlists, POST as createWatchlist } from "../route"

describe("watchlist routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getRequestSession).mockResolvedValue({
      user: {
        id: "user_123",
      },
    } as Awaited<ReturnType<typeof getRequestSession>>)
  })

  it("returns a structured 401 when the session is missing", async () => {
    vi.mocked(getRequestSession).mockResolvedValue(null)

    const response = await getWatchlists(new Request("https://example.test"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      code: "unauthorized",
      error: "Unauthorized.",
    })
  })

  it("returns a valid watchlist list response", async () => {
    vi.mocked(getMarketSidebarData).mockResolvedValue({
      plan: {} as never,
      warnings: [],
      watchlists: [
        {
          createdAt: "2026-03-28T00:00:00.000Z",
          id: "wl_1",
          name: "Core",
          symbols: ["AAPL"],
          updatedAt: "2026-03-28T00:00:00.000Z",
        },
      ],
    })

    const response = await getWatchlists(new Request("https://example.test"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      watchlists: [
        expect.objectContaining({
          id: "wl_1",
          name: "Core",
        }),
      ],
    })
  })

  it("returns storage unavailable when migrations are missing", async () => {
    vi.mocked(getMarketSidebarData).mockResolvedValue({
      plan: {} as never,
      warnings: [
        "Market tables are not initialized. Run `pnpm markets:migrate`.",
      ],
      watchlists: [],
    })

    const response = await getWatchlists(new Request("https://example.test"))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      code: "market_storage_unavailable",
      error: "Market storage is not initialized. Run `pnpm markets:migrate`.",
    })
  })

  it("rejects invalid create payloads", async () => {
    const response = await createWatchlist(
      new Request("https://example.test", {
        body: JSON.stringify({ name: "" }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: "invalid_watchlist_payload",
      error: "Invalid watchlist payload.",
    })
  })

  it("creates a watchlist for a valid payload", async () => {
    vi.mocked(createNewWatchlistForUser).mockResolvedValue({
      createdAt: "2026-03-28T00:00:00.000Z",
      id: "wl_2",
      name: "Breakout names",
      symbols: ["NVDA"],
      updatedAt: "2026-03-28T00:00:00.000Z",
    })

    const response = await createWatchlist(
      new Request("https://example.test", {
        body: JSON.stringify({ name: "Breakout names", symbols: ["NVDA"] }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(201)
    const payload = (await response.json()) as {
      watchlist: {
        id: string
        name: string
      }
    }

    expect(payload.watchlist.id).toBe("wl_2")
    expect(payload.watchlist.name).toBe("Breakout names")
  })

  it("returns 404 when updating a missing watchlist", async () => {
    vi.mocked(updateWatchlistSymbolsForUser).mockResolvedValue(null)

    const response = await patchWatchlist(
      new Request("https://example.test", {
        body: JSON.stringify({ symbols: ["AAPL"] }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      }),
      {
        params: Promise.resolve({ id: "missing" }),
      }
    )

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      code: "watchlist_not_found",
      error: "Watchlist not found.",
    })
  })

  it("returns storage unavailable for watchlist detail fetches", async () => {
    vi.mocked(getWatchlistPageData).mockRejectedValue(
      new MarketStoreNotInitializedError()
    )

    const response = await getWatchlist(new Request("https://example.test"), {
      params: Promise.resolve({ id: "wl_1" }),
    })

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      code: "market_storage_unavailable",
      error: "Market storage is not initialized. Run `pnpm markets:migrate`.",
    })
  })
})
