import { NextResponse } from "next/server"
import { z, ZodError } from "zod"

import { createMarketApiErrorResponse } from "@/lib/server/markets/api-errors"
import {
  createMarketApiRequestContext,
  requireMarketSession,
} from "@/lib/server/markets/api-route"
import { isMarketStoreNotInitializedError } from "@/lib/server/markets/errors"
import {
  getSavedMarketScreeners,
  saveMarketScreener,
} from "@/lib/server/markets/service"

export const runtime = "nodejs"

const payloadSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    filters: z
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
      .strict(),
  })
  .strict()

export async function GET(request: Request) {
  const context = createMarketApiRequestContext(request)
  const { response, session } = await requireMarketSession(request, context)

  if (response) {
    return response
  }

  try {
    const screeners = await getSavedMarketScreeners(session.user.id)
    return NextResponse.json(
      { screeners },
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
      `[screeners:${context.requestId}] Failed to load screeners:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "screeners_fetch_failed",
      error: "Failed to load screeners.",
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
    const payload = payloadSchema.parse(await request.json())
    const screener = await saveMarketScreener({
      userId: session.user.id,
      name: payload.name,
      filters: payload.filters,
    })

    return NextResponse.json(
      { screener },
      { status: 201, headers: context.headers }
    )
  } catch (error) {
    if (error instanceof ZodError) {
      return createMarketApiErrorResponse({
        code: "invalid_screener_payload",
        error: "Invalid screener payload.",
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
      `[screeners:${context.requestId}] Failed to save screener:`,
      error
    )
    return createMarketApiErrorResponse({
      code: "screener_save_failed",
      error: "Failed to save screener.",
      headers: context.headers,
      status: 500,
    })
  }
}
