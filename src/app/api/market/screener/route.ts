import { NextResponse } from "next/server"
import { z } from "zod"

import {
  createMarketApiRequestContext,
  requireMarketSession,
} from "@/lib/server/markets/api-route"
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

export async function POST(request: Request) {
  const context = createMarketApiRequestContext(request)
  const { response } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const payload = screenerPayloadSchema.parse(await request.json())
    const results = await runMarketScreener(payload)

    return NextResponse.json(
      { results },
      {
        headers: context.headers,
      }
    )
  } catch (error) {
    console.error(
      `[market-screener:${context.requestId}] Failed to run screener:`,
      error
    )
    return NextResponse.json(
      { error: "Failed to run screener." },
      {
        status: 400,
        headers: context.headers,
      }
    )
  }
}
