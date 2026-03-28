import { NextResponse } from "next/server"

import {
  createAuthUnavailableResponse,
  isAuthConfigured,
} from "@/lib/server/auth"
import { getRequestSession } from "@/lib/server/auth-session"
import { searchMarketSymbols } from "@/lib/server/markets/service"

export const runtime = "nodejs"

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

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""

  try {
    const results = await searchMarketSymbols(query)

    return NextResponse.json(
      { results },
      {
        headers: createHeaders(requestId),
      }
    )
  } catch (error) {
    console.error(
      `[market-search:${requestId}] Failed to search symbols:`,
      error
    )
    return NextResponse.json(
      { error: "Failed to search market symbols." },
      {
        status: 500,
        headers: createHeaders(requestId),
      }
    )
  }
}
