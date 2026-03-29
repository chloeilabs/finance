import { type NextRequest } from "next/server"

import { asRecord, asString } from "@/lib/cast"
import { type AgentStreamEvent } from "@/lib/shared/agent/messages"
import { type ModelType, OPENROUTER_MODELS } from "@/lib/shared/llm/models"

export const STREAM_TIMEOUT_FALLBACK_TEXT =
  "Sorry, I couldn't finish the response in time. Please retry."
export const STREAM_ERROR_FALLBACK_TEXT =
  "Sorry, I hit an error while generating a response. Please retry."

export interface AgentRateLimitDecision {
  allowed: boolean
  limit: number
  remaining: number
  retryAfterSeconds: number | null
  resetAtEpochSeconds: number
}

export function resolveUserTimeZone(request: NextRequest): string | undefined {
  const candidate = request.headers.get("x-user-timezone")?.trim()
  if (!candidate) {
    return undefined
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: candidate,
    }).format(new Date())
    return candidate
  } catch {
    return undefined
  }
}

export function createTimeoutAbortSignal(
  request: NextRequest,
  timeoutMs: number
): AbortSignal {
  if (
    typeof AbortSignal.any === "function" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return AbortSignal.any([request.signal, AbortSignal.timeout(timeoutMs)])
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Timed out", "AbortError"))
  }, timeoutMs)

  if (request.signal.aborted) {
    controller.abort(request.signal.reason)
  } else {
    request.signal.addEventListener(
      "abort",
      () => {
        controller.abort(request.signal.reason)
      },
      { once: true }
    )
  }

  controller.signal.addEventListener(
    "abort",
    () => {
      clearTimeout(timeoutId)
    },
    { once: true }
  )

  return controller.signal
}

export function textDeltaEvent(delta: string): AgentStreamEvent {
  return { type: "text_delta", delta }
}

export function isProviderAuthenticationError(error: unknown): boolean {
  const record = asRecord(error)
  const status =
    typeof record?.status === "number"
      ? record.status
      : typeof record?.statusCode === "number"
        ? record.statusCode
        : undefined
  if (status === 401 || status === 403) {
    return true
  }

  const code = asString(record?.code)?.toLowerCase()
  if (code === "invalid_api_key") {
    return true
  }

  const message =
    asString(record?.message)?.toLowerCase() ??
    (error instanceof Error ? error.message.toLowerCase() : "")

  return message.includes("api key")
}

export function isOpenRouterModel(model: ModelType): boolean {
  return (OPENROUTER_MODELS as readonly ModelType[]).includes(model)
}

export function resolveRateLimitIdentifier(userId: string): string {
  return `user:${userId}`
}

export function resolveRequestId(request: NextRequest): string {
  const incomingRequestId = request.headers.get("x-request-id")?.trim()
  if (incomingRequestId) {
    return incomingRequestId
  }

  return crypto.randomUUID()
}

export function createBaseHeaders(requestId: string): Headers {
  return new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "X-Request-Id": requestId,
  })
}

export function applyRateLimitHeaders(
  headers: Headers,
  rateLimitDecision: AgentRateLimitDecision
) {
  headers.set("X-RateLimit-Limit", String(rateLimitDecision.limit))
  headers.set("X-RateLimit-Remaining", String(rateLimitDecision.remaining))
  headers.set(
    "X-RateLimit-Reset",
    String(rateLimitDecision.resetAtEpochSeconds)
  )
}

export function createJsonErrorResponse(params: {
  requestId: string
  error: string
  status: number
  rateLimitDecision?: AgentRateLimitDecision
  retryAfterSeconds?: number | null
}) {
  const headers = createBaseHeaders(params.requestId)
  if (params.rateLimitDecision) {
    applyRateLimitHeaders(headers, params.rateLimitDecision)
  }
  if (
    params.retryAfterSeconds !== null &&
    params.retryAfterSeconds !== undefined &&
    params.retryAfterSeconds > 0
  ) {
    headers.set("Retry-After", String(params.retryAfterSeconds))
  }

  return Response.json(
    { error: params.error },
    {
      status: params.status,
      headers,
    }
  )
}
