import type { NextRequest } from "next/server"
import { describe, expect, it } from "vitest"

import type { ModelType } from "@/lib/shared/llm/models"

import {
  applyRateLimitHeaders,
  createBaseHeaders,
  createJsonErrorResponse,
  isOpenRouterModel,
  isProviderAuthenticationError,
  resolveRateLimitIdentifier,
  resolveRequestId,
  resolveUserTimeZone,
  textDeltaEvent,
} from "../route-helpers"

function createMockRequest(
  headers: Record<string, string> = {}
): NextRequest {
  return {
    headers: new Headers(headers),
    signal: new AbortController().signal,
  } as unknown as NextRequest
}

describe("resolveUserTimeZone", () => {
  it("returns a valid timezone from the header", () => {
    const request = createMockRequest({
      "x-user-timezone": "America/New_York",
    })
    expect(resolveUserTimeZone(request)).toBe("America/New_York")
  })

  it("returns undefined when the header is missing", () => {
    const request = createMockRequest()
    expect(resolveUserTimeZone(request)).toBeUndefined()
  })

  it("returns undefined for an invalid timezone", () => {
    const request = createMockRequest({
      "x-user-timezone": "Not/A/Timezone",
    })
    expect(resolveUserTimeZone(request)).toBeUndefined()
  })

  it("trims whitespace from the header", () => {
    const request = createMockRequest({
      "x-user-timezone": "  UTC  ",
    })
    expect(resolveUserTimeZone(request)).toBe("UTC")
  })

  it("returns undefined for an empty header", () => {
    const request = createMockRequest({ "x-user-timezone": "  " })
    expect(resolveUserTimeZone(request)).toBeUndefined()
  })
})

describe("textDeltaEvent", () => {
  it("creates a text_delta event", () => {
    const event = textDeltaEvent("Hello")
    expect(event).toEqual({ type: "text_delta", delta: "Hello" })
  })
})

describe("isProviderAuthenticationError", () => {
  it("returns true for status 401", () => {
    expect(isProviderAuthenticationError({ status: 401 })).toBe(true)
  })

  it("returns true for status 403", () => {
    expect(isProviderAuthenticationError({ status: 403 })).toBe(true)
  })

  it("returns true for statusCode 401", () => {
    expect(isProviderAuthenticationError({ statusCode: 401 })).toBe(true)
  })

  it("returns true for code invalid_api_key", () => {
    expect(isProviderAuthenticationError({ code: "invalid_api_key" })).toBe(
      true
    )
  })

  it("returns true when message contains api key", () => {
    expect(
      isProviderAuthenticationError(new Error("Invalid api key provided"))
    ).toBe(true)
  })

  it("returns false for a generic error", () => {
    expect(isProviderAuthenticationError(new Error("timeout"))).toBe(false)
  })

  it("returns false for null", () => {
    expect(isProviderAuthenticationError(null)).toBe(false)
  })

  it("returns false for undefined", () => {
    expect(isProviderAuthenticationError(undefined)).toBe(false)
  })
})

describe("isOpenRouterModel", () => {
  it("returns true for an OpenRouter model", () => {
    expect(isOpenRouterModel("minimax/minimax-m2.7")).toBe(true)
  })

  it("returns false for an unknown model", () => {
    expect(
      isOpenRouterModel("unknown/model" as ModelType)
    ).toBe(false)
  })
})

describe("resolveRateLimitIdentifier", () => {
  it("prefixes userId with user:", () => {
    expect(resolveRateLimitIdentifier("abc123")).toBe("user:abc123")
  })
})

describe("resolveRequestId", () => {
  it("uses the x-request-id header when present", () => {
    const request = createMockRequest({ "x-request-id": "req-123" })
    expect(resolveRequestId(request)).toBe("req-123")
  })

  it("generates a UUID when the header is missing", () => {
    const request = createMockRequest()
    const id = resolveRequestId(request)
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })
})

describe("createBaseHeaders", () => {
  it("includes Cache-Control, X-Content-Type-Options, and X-Request-Id", () => {
    const headers = createBaseHeaders("req-42")
    expect(headers.get("Cache-Control")).toBe("no-store")
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff")
    expect(headers.get("X-Request-Id")).toBe("req-42")
  })
})

describe("applyRateLimitHeaders", () => {
  it("sets rate limit headers on the provided Headers object", () => {
    const headers = new Headers()
    applyRateLimitHeaders(headers, {
      allowed: true,
      limit: 60,
      remaining: 55,
      retryAfterSeconds: null,
      resetAtEpochSeconds: 1700000000,
    })

    expect(headers.get("X-RateLimit-Limit")).toBe("60")
    expect(headers.get("X-RateLimit-Remaining")).toBe("55")
    expect(headers.get("X-RateLimit-Reset")).toBe("1700000000")
  })
})

describe("createJsonErrorResponse", () => {
  it("returns a Response with the correct status", async () => {
    const response = createJsonErrorResponse({
      requestId: "req-1",
      error: "Bad request",
      status: 400,
    })
    expect(response.status).toBe(400)
    const body = (await response.json()) as { error: string }
    expect(body.error).toBe("Bad request")
  })

  it("includes rate limit headers when provided", () => {
    const response = createJsonErrorResponse({
      requestId: "req-1",
      error: "Too many requests",
      status: 429,
      rateLimitDecision: {
        allowed: false,
        limit: 60,
        remaining: 0,
        retryAfterSeconds: 30,
        resetAtEpochSeconds: 1700000000,
      },
      retryAfterSeconds: 30,
    })

    expect(response.headers.get("X-RateLimit-Limit")).toBe("60")
    expect(response.headers.get("Retry-After")).toBe("30")
  })

  it("omits Retry-After when retryAfterSeconds is null", () => {
    const response = createJsonErrorResponse({
      requestId: "req-1",
      error: "Error",
      status: 500,
      retryAfterSeconds: null,
    })

    expect(response.headers.get("Retry-After")).toBeNull()
  })
})
