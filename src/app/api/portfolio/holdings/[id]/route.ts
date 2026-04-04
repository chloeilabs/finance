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
import {
  deletePortfolioHoldingForUser,
  updatePortfolioHoldingForUser,
} from "@/lib/server/markets/service"

export const runtime = "nodejs"

const updatePortfolioHoldingPayloadSchema = z
  .object({
    symbol: z.string().trim().min(1).max(32).optional(),
    shares: z.number().positive().optional(),
    averageCost: z.number().min(0).optional(),
    targetWeight: z.number().min(0).max(100).nullable().optional(),
    notes: z.string().trim().max(600).nullable().optional(),
  })
  .strict()
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be updated.",
  })

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = createMarketApiRequestContext(request)
  const { response, session } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const payload = updatePortfolioHoldingPayloadSchema.parse(await request.json())
    const { id } = await params
    const holding = await updatePortfolioHoldingForUser({
      userId: session.user.id,
      holdingId: id,
      input: payload,
    })

    if (!holding) {
      return createMarketApiErrorResponse({
        code: "portfolio_holding_not_found",
        error: "Portfolio holding not found.",
        headers: context.headers,
        status: 404,
      })
    }

    return NextResponse.json(
      { holding },
      {
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
      `[portfolio-holdings:${context.requestId}] Failed to update holding:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "portfolio_holding_update_failed",
      error: "Failed to update portfolio holding.",
      headers: context.headers,
      status: 500,
    })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const context = createMarketApiRequestContext(request)
  const { response, session } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const { id } = await params
    const deleted = await deletePortfolioHoldingForUser({
      userId: session.user.id,
      holdingId: id,
    })

    if (!deleted) {
      return createMarketApiErrorResponse({
        code: "portfolio_holding_not_found",
        error: "Portfolio holding not found.",
        headers: context.headers,
        status: 404,
      })
    }

    return new Response(null, {
      headers: context.headers,
      status: 204,
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

    console.error(
      `[portfolio-holdings:${context.requestId}] Failed to delete holding:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "portfolio_holding_delete_failed",
      error: "Failed to delete portfolio holding.",
      headers: context.headers,
      status: 500,
    })
  }
}
