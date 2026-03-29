import { NextResponse } from "next/server"

import { createMarketApiErrorResponse } from "@/lib/server/markets/api-errors"
import {
  createMarketApiRequestContext,
  requireMarketSession,
} from "@/lib/server/markets/api-route"
import { isMarketStoreNotInitializedError } from "@/lib/server/markets/errors"
import { deleteSavedMarketScreener } from "@/lib/server/markets/service"

export const runtime = "nodejs"

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
    await deleteSavedMarketScreener({
      userId: session.user.id,
      screenerId: id,
    })

    return NextResponse.json(
      { ok: true },
      { headers: context.headers }
    )
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
      `[screener:${context.requestId}] Failed to delete screener:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "screener_delete_failed",
      error: "Failed to delete screener.",
      headers: context.headers,
      status: 500,
    })
  }
}
