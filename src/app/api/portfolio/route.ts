import { NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { createMarketApiErrorResponse } from "@/lib/server/markets/api-errors"
import {
  createMarketApiRequestContext,
  requireMarketSession,
} from "@/lib/server/markets/api-route"
import {
  isMarketStoreNotInitializedError,
} from "@/lib/server/markets/errors"
import {
  getPortfolioPageData,
  updatePortfolioCashBalanceForUser,
} from "@/lib/server/markets/service"

export const runtime = "nodejs"

const updatePortfolioPayloadSchema = z
  .object({
    cashBalance: z.number().min(0),
  })
  .strict()

export async function GET(request: Request) {
  const context = createMarketApiRequestContext(request)
  const { response, session } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const data = await getPortfolioPageData(session.user.id)

    return NextResponse.json(data, {
      headers: context.headers,
    })
  } catch (error) {
    if (isMarketStoreNotInitializedError(error)) {
      return createMarketApiErrorResponse({
        code: error.code,
        error: error.message,
        headers: context.headers,
        status: 503,
      })
    }

    console.error(`[portfolio:${context.requestId}] Failed to fetch portfolio:`, error)
    return createMarketApiErrorResponse({
      code: "portfolio_fetch_failed",
      error: "Failed to fetch portfolio.",
      headers: context.headers,
      status: 500,
    })
  }
}

export async function PATCH(request: Request) {
  const context = createMarketApiRequestContext(request)
  const { response, session } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const payload = updatePortfolioPayloadSchema.parse(await request.json())
    const portfolio = await updatePortfolioCashBalanceForUser({
      userId: session.user.id,
      cashBalance: payload.cashBalance,
    })

    return NextResponse.json(
      { portfolio },
      {
        headers: context.headers,
      }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return createMarketApiErrorResponse({
        code: "invalid_portfolio_payload",
        error: "Invalid portfolio payload.",
        headers: context.headers,
        status: 400,
      })
    }

    if (isMarketStoreNotInitializedError(error)) {
      return createMarketApiErrorResponse({
        code: error.code,
        error: error.message,
        headers: context.headers,
        status: 503,
      })
    }

    console.error(`[portfolio:${context.requestId}] Failed to update portfolio:`, error)
    return createMarketApiErrorResponse({
      code: "portfolio_update_failed",
      error: "Failed to update portfolio.",
      headers: context.headers,
      status: 500,
    })
  }
}
