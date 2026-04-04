import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  MarketStoreNotInitializedError,
  PortfolioDuplicateSymbolError,
} from "@/lib/server/markets/errors"

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
  createPortfolioHoldingForUser: vi.fn(),
  deletePortfolioHoldingForUser: vi.fn(),
  getPortfolioPageData: vi.fn(),
  updatePortfolioCashBalanceForUser: vi.fn(),
  updatePortfolioHoldingForUser: vi.fn(),
}))

import { getRequestSession } from "@/lib/server/auth-session"
import {
  createPortfolioHoldingForUser,
  deletePortfolioHoldingForUser,
  getPortfolioPageData,
  updatePortfolioCashBalanceForUser,
  updatePortfolioHoldingForUser,
} from "@/lib/server/markets/service"

import { DELETE as deleteHolding,PATCH as patchHolding } from "../holdings/[id]/route"
import { POST as createHolding } from "../holdings/route"
import { GET as getPortfolio, PATCH as patchPortfolio } from "../route"

describe("portfolio routes", () => {
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

    const response = await getPortfolio(new Request("https://example.test"))

    expect(response.status).toBe(401)
    await expect(response.json()).resolves.toEqual({
      code: "unauthorized",
      error: "Unauthorized.",
    })
  })

  it("returns portfolio page data", async () => {
    vi.mocked(getPortfolioPageData).mockResolvedValue({
      holdings: [],
      instrumentAllocations: [],
      portfolio: {
        baseCurrency: "USD",
        cashBalance: 1000,
        createdAt: "2026-04-03T00:00:00.000Z",
        id: "default",
        name: "Portfolio",
        updatedAt: "2026-04-03T00:00:00.000Z",
      },
      sectorAllocations: [],
      summary: {
        cashBalance: 1000,
        dayChangePercent: 0,
        dayChangeValue: 0,
        holdingCount: 0,
        investedValue: 0,
        topPositionConcentration: null,
        totalCostBasis: 0,
        totalValue: 1000,
        unrealizedGainLoss: 0,
        unrealizedGainLossPercent: null,
        weightedAverageDividendYield: null,
      },
    })

    const response = await getPortfolio(new Request("https://example.test"))
    const payload = (await response.json()) as {
      portfolio: {
        id: string
      }
    }

    expect(response.status).toBe(200)
    expect(payload.portfolio.id).toBe("default")
  })

  it("rejects invalid cash update payloads", async () => {
    const response = await patchPortfolio(
      new Request("https://example.test", {
        body: JSON.stringify({ cashBalance: -1 }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: "invalid_portfolio_payload",
      error: "Invalid portfolio payload.",
    })
  })

  it("updates portfolio cash balance", async () => {
    vi.mocked(updatePortfolioCashBalanceForUser).mockResolvedValue({
      baseCurrency: "USD",
      cashBalance: 1500,
      createdAt: "2026-04-03T00:00:00.000Z",
      id: "default",
      name: "Portfolio",
      updatedAt: "2026-04-03T00:00:00.000Z",
    })

    const response = await patchPortfolio(
      new Request("https://example.test", {
        body: JSON.stringify({ cashBalance: 1500 }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "PATCH",
      })
    )

    expect(response.status).toBe(200)
    const payload = (await response.json()) as {
      portfolio: {
        cashBalance: number
      }
    }

    expect(payload.portfolio.cashBalance).toBe(1500)
  })

  it("rejects duplicate symbols", async () => {
    vi.mocked(createPortfolioHoldingForUser).mockRejectedValue(
      new PortfolioDuplicateSymbolError()
    )

    const response = await createHolding(
      new Request("https://example.test", {
        body: JSON.stringify({
          averageCost: 180,
          shares: 5,
          symbol: "AAPL",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      code: "portfolio_duplicate_symbol",
      error: "Portfolio already includes this symbol.",
    })
  })

  it("creates a holding for a valid payload", async () => {
    vi.mocked(createPortfolioHoldingForUser).mockResolvedValue({
      averageCost: 180,
      createdAt: "2026-04-03T00:00:00.000Z",
      id: "holding_1",
      notes: null,
      shares: 5,
      symbol: "AAPL",
      targetWeight: null,
      updatedAt: "2026-04-03T00:00:00.000Z",
    })

    const response = await createHolding(
      new Request("https://example.test", {
        body: JSON.stringify({
          averageCost: 180,
          shares: 5,
          symbol: "AAPL",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      })
    )

    expect(response.status).toBe(201)
    const payload = (await response.json()) as {
      holding: {
        id: string
        symbol: string
      }
    }

    expect(payload.holding.id).toBe("holding_1")
    expect(payload.holding.symbol).toBe("AAPL")
  })

  it("returns 404 when updating a missing holding", async () => {
    vi.mocked(updatePortfolioHoldingForUser).mockResolvedValue(null)

    const response = await patchHolding(
      new Request("https://example.test", {
        body: JSON.stringify({ shares: 7 }),
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
      code: "portfolio_holding_not_found",
      error: "Portfolio holding not found.",
    })
  })

  it("deletes a holding", async () => {
    vi.mocked(deletePortfolioHoldingForUser).mockResolvedValue(true)

    const response = await deleteHolding(new Request("https://example.test"), {
      params: Promise.resolve({ id: "holding_1" }),
    })

    expect(response.status).toBe(204)
  })

  it("returns storage unavailable when migrations are missing", async () => {
    vi.mocked(getPortfolioPageData).mockRejectedValue(
      new MarketStoreNotInitializedError()
    )

    const response = await getPortfolio(new Request("https://example.test"))

    expect(response.status).toBe(503)
    await expect(response.json()).resolves.toEqual({
      code: "market_storage_unavailable",
      error: "Market storage is not initialized. Run `pnpm markets:migrate`.",
    })
  })
})
