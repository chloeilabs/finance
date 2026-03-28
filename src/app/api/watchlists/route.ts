import { NextResponse } from "next/server"
import { z } from "zod"

import {
  createAuthUnavailableResponse,
  isAuthConfigured,
} from "@/lib/server/auth"
import { getRequestSession } from "@/lib/server/auth-session"
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

function createHeaders(requestId: string) {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  }
}

export async function GET(request: Request) {
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
    const { watchlists } = await getMarketSidebarData(session.user.id)
    return NextResponse.json(
      { watchlists },
      {
        headers: createHeaders(requestId),
      }
    )
  } catch (error) {
    console.error(
      `[watchlists:${requestId}] Failed to fetch watchlists:`,
      error
    )
    return NextResponse.json(
      { error: "Failed to fetch watchlists." },
      {
        status: 500,
        headers: createHeaders(requestId),
      }
    )
  }
}

export async function POST(request: Request) {
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
        headers: createHeaders(requestId),
      }
    )
  } catch (error) {
    console.error(
      `[watchlists:${requestId}] Failed to create watchlist:`,
      error
    )
    return NextResponse.json(
      { error: "Failed to create watchlist." },
      {
        status: 400,
        headers: createHeaders(requestId),
      }
    )
  }
}
