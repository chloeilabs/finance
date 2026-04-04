import { NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { createMarketApiErrorResponse } from "@/lib/server/markets/api-errors"
import {
  createMarketApiRequestContext,
  requireMarketSession,
} from "@/lib/server/markets/api-route"
import {
  isMarketStoreNotInitializedError,
  isPortfolioDuplicateSymbolError,
} from "@/lib/server/markets/errors"
import { createPortfolioHoldingForUser } from "@/lib/server/markets/service"

export const runtime = "nodejs"

const portfolioHoldingPayloadSchema = z
  .object({
    symbol: z.string().trim().min(1).max(32),
    shares: z.number().positive(),
    averageCost: z.number().min(0),
    targetWeight: z.number().min(0).max(100).nullable().optional(),
    notes: z.string().trim().max(600).nullable().optional(),
  })
  .strict()

export async function POST(request: Request) {
  const context = createMarketApiRequestContext(request)
  const { response, session } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const payload = portfolioHoldingPayloadSchema.parse(await request.json())
    const holding = await createPortfolioHoldingForUser({
      userId: session.user.id,
      input: payload,
    })

    return NextResponse.json(
      { holding },
      {
        status: 201,
        headers: context.headers,
      }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return createMarketApiErrorResponse({
        code: "invalid_portfolio_holding_payload",
        error: "Invalid portfolio holding payload.",
        headers: context.headers,
        status: 400,
      })
    }

    if (isPortfolioDuplicateSymbolError(error)) {
      return createMarketApiErrorResponse({
        code: error.code,
        error: error.message,
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

    console.error(
      `[portfolio-holdings:${context.requestId}] Failed to create holding:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "portfolio_holding_create_failed",
      error: "Failed to create portfolio holding.",
      headers: context.headers,
      status: 500,
    })
  }
}
