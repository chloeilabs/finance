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
  deleteSavedMarketScreener: vi.fn(),
  getSavedMarketScreeners: vi.fn(),
  saveMarketScreener: vi.fn(),
}))

import { getRequestSession } from "@/lib/server/auth-session"
import {
  deleteSavedMarketScreener,
  getSavedMarketScreeners,
  saveMarketScreener,
} from "@/lib/server/markets/service"

import { DELETE as deleteScreener } from "../[id]/route"
import { GET as getScreeners, POST as saveScreener } from "../route"

describe("screener routes", () => {
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

    const response = await getScreeners(new Request("https://example.test"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      code: "unauthorized",
      error: "Unauthorized.",
    })
  })

  it("returns saved screeners for a valid request", async () => {
    vi.mocked(getSavedMarketScreeners).mockResolvedValue([
      {
        createdAt: "2026-03-28T00:00:00.000Z",
        filters: {
          priceMin: 20,
        },
        id: "screen_1",
        name: "Momentum",
        updatedAt: "2026-03-28T00:00:00.000Z",
      },
    ])

    const response = await getScreeners(new Request("https://example.test"))

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      screeners: [
        expect.objectContaining({
          id: "screen_1",
          name: "Momentum",
        }),
      ],
    })
  })

  it("returns storage unavailable when screener storage is missing", async () => {
    vi.mocked(getSavedMarketScreeners).mockRejectedValue(
      new MarketStoreNotInitializedError()
    )

    const response = await getScreeners(new Request("https://example.test"))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      code: "market_storage_unavailable",
      error: "Market storage is not initialized. Run `pnpm markets:migrate`.",
    })
  })

  it("rejects invalid screener payloads", async () => {
    const response = await saveScreener(
      new Request("https://example.test", {
        body: JSON.stringify({ name: "", filters: {} }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: "invalid_screener_payload",
      error: "Invalid screener payload.",
    })
  })

  it("saves a screener for valid input", async () => {
    vi.mocked(saveMarketScreener).mockResolvedValue({
      createdAt: "2026-03-28T00:00:00.000Z",
      filters: {
        priceMin: 20,
      },
      id: "screen_2",
      name: "Value setup",
      updatedAt: "2026-03-28T00:00:00.000Z",
    })

    const response = await saveScreener(
      new Request("https://example.test", {
        body: JSON.stringify({
          name: "Value setup",
          filters: {
            priceMin: 20,
          },
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(201)
    const payload = (await response.json()) as {
      screener: {
        id: string
        name: string
      }
    }

    expect(payload.screener.id).toBe("screen_2")
    expect(payload.screener.name).toBe("Value setup")
  })

  it("returns a structured 500 for unexpected delete failures", async () => {
    vi.mocked(deleteSavedMarketScreener).mockRejectedValue(new Error("boom"))

    const response = await deleteScreener(
      new Request("https://example.test", {
        method: "DELETE",
      }),
      {
        params: Promise.resolve({ id: "screen_1" }),
      }
    )

    expect(response.status).toBe(500)
    await expect(response.json()).resolves.toEqual({
      code: "screener_delete_failed",
      error: "Failed to delete screener.",
    })
  })
})
