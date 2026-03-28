import { NextResponse } from "next/server"

import {
  createAuthUnavailableResponse,
  isAuthConfigured,
} from "@/lib/server/auth"
import { getRequestSession } from "@/lib/server/auth-session"
import { getStockDossier } from "@/lib/server/markets/service"

export const runtime = "nodejs"

function createHeaders(requestId: string) {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
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
    const { symbol } = await params
    const dossier = await getStockDossier(symbol)

    return NextResponse.json(dossier, {
      headers: createHeaders(requestId),
    })
  } catch (error) {
    console.error(
      `[market-dossier:${requestId}] Failed to load dossier:`,
      error
    )
    return NextResponse.json(
      { error: "Failed to load stock dossier." },
      {
        status: 500,
        headers: createHeaders(requestId),
      }
    )
  }
}
