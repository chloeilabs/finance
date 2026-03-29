import { NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { createMarketApiErrorResponse } from "@/lib/server/markets/api-errors"
import {
  createMarketApiRequestContext,
  requireMarketSession,
} from "@/lib/server/markets/api-route"
import { isMarketStoreNotInitializedError } from "@/lib/server/markets/errors"
import {
  createNewWatchlistForUser,
  getMarketSidebarData,
} from "@/lib/server/markets/service"

export const runtime = "nodejs"

const createWatchlistPayloadSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    symbols: z.array(z.string().trim().min(1).max(32)).max(100).optional(),
  })
  .strict()

export async function GET(request: Request) {
  const context = createMarketApiRequestContext(request)
  const { response, session } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const { watchlists, warnings } = await getMarketSidebarData(session.user.id)

    if (warnings.some((warning) => warning.includes("pnpm markets:migrate"))) {
      return createMarketApiErrorResponse({
        code: "market_storage_unavailable",
        error: "Market storage is not initialized. Run `pnpm markets:migrate`.",
        headers: context.headers,
        status: 503,
      })
    }

    return NextResponse.json(
      { watchlists },
      {
        headers: context.headers,
      }
    )
  } catch (error) {
    console.error(
      `[watchlists:${context.requestId}] Failed to fetch watchlists:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "watchlists_fetch_failed",
      error: "Failed to fetch watchlists.",
      headers: context.headers,
      status: 500,
    })
  }
}

export async function POST(request: Request) {
  const context = createMarketApiRequestContext(request)
  const { response, session } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const payload = createWatchlistPayloadSchema.parse(await request.json())
    const watchlist = await createNewWatchlistForUser({
      userId: session.user.id,
      name: payload.name,
      symbols: payload.symbols,
    })

    return NextResponse.json(
      { watchlist },
      {
        status: 201,
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
      `[watchlists:${context.requestId}] Failed to create watchlist:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "watchlist_create_failed",
      error: "Failed to create watchlist.",
      headers: context.headers,
      status: 500,
    })
  }
}
