import "server-only"

import { NextResponse } from "next/server"

export interface MarketApiErrorResponseInit {
  code: string
  error: string
  headers?: HeadersInit
  status: number
}

export function createMarketApiErrorResponse(
  params: MarketApiErrorResponseInit
) {
  return NextResponse.json(
    {
      code: params.code,
      error: params.error,
    },
    {
      status: params.status,
      headers: params.headers,
    }
  )
}
