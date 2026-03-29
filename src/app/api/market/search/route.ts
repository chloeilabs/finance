import { NextResponse } from "next/server"

import {
  createMarketApiRequestContext,
  requireMarketSession,
} from "@/lib/server/markets/api-route"
import { searchMarketSymbols } from "@/lib/server/markets/service"

export const runtime = "nodejs"

export async function GET(request: Request) {
  const context = createMarketApiRequestContext(request)
  const { response } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  const query = new URL(request.url).searchParams.get("q")?.trim() ?? ""

  try {
    const results = await searchMarketSymbols(query)

    return NextResponse.json(
      { results },
      {
        headers: context.headers,
      }
    )
  } catch (error) {
    console.error(
      `[market-search:${context.requestId}] Failed to search symbols:`,
      error
    )
    return NextResponse.json(
      { error: "Failed to search market symbols." },
      {
        status: 500,
        headers: context.headers,
      }
    )
  }
}
