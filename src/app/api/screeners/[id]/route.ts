import { NextResponse } from "next/server"

import {
  createAuthUnavailableResponse,
  isAuthConfigured,
} from "@/lib/server/auth"
import { getRequestSession } from "@/lib/server/auth-session"
import { deleteSavedMarketScreener } from "@/lib/server/markets/service"

export const runtime = "nodejs"

function createHeaders(requestId: string) {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  }
}

export async function DELETE(
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
      { status: 401, headers: createHeaders(requestId) }
    )
  }

  try {
    const { id } = await params
    await deleteSavedMarketScreener({
      userId: session.user.id,
      screenerId: id,
    })

    return NextResponse.json({ ok: true }, { headers: createHeaders(requestId) })
  } catch (error) {
    console.error(`[screener:${requestId}] Failed to delete screener:`, error)
    return NextResponse.json(
      { error: "Failed to delete screener." },
      { status: 400, headers: createHeaders(requestId) }
    )
  }
}
