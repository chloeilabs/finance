import { NextResponse } from "next/server"
import { z } from "zod"

import {
  createAuthUnavailableResponse,
  isAuthConfigured,
} from "@/lib/server/auth"
import { getRequestSession } from "@/lib/server/auth-session"
import { runMarketScreener } from "@/lib/server/markets/service"

export const runtime = "nodejs"

const screenerPayloadSchema = z
  .object({
    marketCapMin: z.number().optional(),
    marketCapMax: z.number().optional(),
    betaMin: z.number().optional(),
    betaMax: z.number().optional(),
    volumeMin: z.number().optional(),
    volumeMax: z.number().optional(),
    dividendMin: z.number().optional(),
    dividendMax: z.number().optional(),
    priceMin: z.number().optional(),
    priceMax: z.number().optional(),
    isEtf: z.boolean().optional(),
    isActivelyTrading: z.boolean().optional(),
    sector: z.string().trim().min(1).max(120).optional(),
    industry: z.string().trim().min(1).max(120).optional(),
    exchange: z.string().trim().min(1).max(120).optional(),
    sortBy: z
      .enum(["symbol", "marketCap", "price", "volume", "beta", "dividend"])
      .optional(),
    sortDirection: z.enum(["asc", "desc"]).optional(),
  })
  .strict()

function createHeaders(requestId: string) {
  return {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
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
    const payload = screenerPayloadSchema.parse(await request.json())
    const results = await runMarketScreener(payload)

    return NextResponse.json(
      { results },
      {
        headers: createHeaders(requestId),
      }
    )
  } catch (error) {
    console.error(
      `[market-screener:${requestId}] Failed to run screener:`,
      error
    )
    return NextResponse.json(
      { error: "Failed to run screener." },
      {
        status: 400,
        headers: createHeaders(requestId),
      }
    )
  }
}
