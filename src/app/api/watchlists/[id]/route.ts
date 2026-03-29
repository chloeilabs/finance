import { NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { createMarketApiErrorResponse } from "@/lib/server/markets/api-errors"
import {
  createMarketApiRequestContext,
  requireMarketSession,
} from "@/lib/server/markets/api-route"
import { isMarketStoreNotInitializedError } from "@/lib/server/markets/errors"
import {
  getWatchlistPageData,
  primeQuoteCacheForSymbols,
  updateWatchlistSymbolsForUser,
} from "@/lib/server/markets/service"

export const runtime = "nodejs"

const updateWatchlistPayloadSchema = z
  .object({
    symbols: z.array(z.string().trim().min(1).max(32)).max(300),
    refresh: z.boolean().optional(),
  })
  .strict()

export async function GET(
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
    const data = await getWatchlistPageData({
      userId: session.user.id,
      watchlistId: id,
    })

    if (!data.watchlist) {
      return createMarketApiErrorResponse({
        code: "watchlist_not_found",
        error: "Watchlist not found.",
        headers: context.headers,
        status: 404,
      })
    }

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

    console.error(
      `[watchlist:${context.requestId}] Failed to fetch watchlist:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "watchlist_fetch_failed",
      error: "Failed to fetch watchlist.",
      headers: context.headers,
      status: 500,
    })
  }
}

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
    const payload = updateWatchlistPayloadSchema.parse(await request.json())
    const { id } = await params
    const watchlist = await updateWatchlistSymbolsForUser({
      userId: session.user.id,
      watchlistId: id,
      symbols: payload.symbols,
    })

    if (!watchlist) {
      return createMarketApiErrorResponse({
        code: "watchlist_not_found",
        error: "Watchlist not found.",
        headers: context.headers,
        status: 404,
      })
    }

    if (payload.refresh) {
      await primeQuoteCacheForSymbols(watchlist.symbols).catch(() => undefined)
    }

    return NextResponse.json(
      { watchlist },
      {
        headers: context.headers,
      }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return createMarketApiErrorResponse({
        code: "invalid_watchlist_payload",
        error: "Invalid watchlist payload.",
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
      `[watchlist:${context.requestId}] Failed to update watchlist:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "watchlist_update_failed",
      error: "Failed to update watchlist.",
      headers: context.headers,
      status: 500,
    })
  }
}
