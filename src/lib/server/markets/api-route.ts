import "server-only"

import {
  createAuthUnavailableResponse,
  isAuthConfigured,
} from "@/lib/server/auth"
import {
  type AuthSessionValue,
  getRequestSession,
} from "@/lib/server/auth-session"

import { createMarketApiErrorResponse } from "./api-errors"

export interface MarketApiRequestContext {
  headers: Headers
  requestId: string
}

export function createMarketApiHeaders(requestId: string): Headers {
  return new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  })
}

export function createMarketApiRequestContext(
  request: Request
): MarketApiRequestContext {
  const requestId =
    request.headers.get("x-request-id")?.trim() ?? crypto.randomUUID()

  return {
    requestId,
    headers: createMarketApiHeaders(requestId),
  }
}

export async function requireMarketSession(
  request: Request,
  context: MarketApiRequestContext
): Promise<
  | {
      response: Response
      session: null
    }
  | {
      response: null
      session: AuthSessionValue
    }
> {
  if (!isAuthConfigured()) {
    return {
      response: createAuthUnavailableResponse(context.headers),
      session: null,
    }
  }

  const session = await getRequestSession(new Headers(request.headers))

  if (!session) {
    return {
      response: createMarketApiErrorResponse({
        code: "unauthorized",
        error: "Unauthorized.",
        headers: context.headers,
        status: 401,
      }),
      session: null,
    }
  }

  return {
    response: null,
    session,
  }
}
