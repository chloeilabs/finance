import { NextResponse } from "next/server"
import { z } from "zod"

import {
  createAuthUnavailableResponse,
  isAuthConfigured,
} from "@/lib/server/auth"
import { getRequestSession } from "@/lib/server/auth-session"
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

function createHeaders(requestId: string) {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID()

  if (!isAuthConfigured()) {
    return createAuthUnavailableResponse(createHeaders(requestId))
  }

  const session = await getRequestSession(new Headers(request.headers))

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      {
        status: 401,
        headers: createHeaders(requestId),
      }
    )
  }

  try {
    const { id } = await params
    const data = await getWatchlistPageData({
      userId: session.user.id,
      watchlistId: id,
    })

    return NextResponse.json(data, {
      headers: createHeaders(requestId),
    })
  } catch (error) {
    console.error(`[watchlist:${requestId}] Failed to fetch watchlist:`, error)
    return NextResponse.json(
      { error: "Failed to fetch watchlist." },
      {
        status: 500,
        headers: createHeaders(requestId),
      }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID()

  if (!isAuthConfigured()) {
    return createAuthUnavailableResponse(createHeaders(requestId))
  }

  const session = await getRequestSession(new Headers(request.headers))

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized." },
      {
        status: 401,
        headers: createHeaders(requestId),
      }
    )
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
      return NextResponse.json(
        { error: "Watchlist not found." },
        {
          status: 404,
          headers: createHeaders(requestId),
        }
      )
    }

    if (payload.refresh) {
      await primeQuoteCacheForSymbols(watchlist.symbols).catch(() => undefined)
    }

    return NextResponse.json(
      { watchlist },
      {
        headers: createHeaders(requestId),
      }
    )
  } catch (error) {
    console.error(`[watchlist:${requestId}] Failed to update watchlist:`, error)
    return NextResponse.json(
      { error: "Failed to update watchlist." },
      {
        status: 400,
        headers: createHeaders(requestId),
      }
    )
  }
}
