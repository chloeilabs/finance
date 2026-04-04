import { type NextRequest } from "next/server"

import { getModels } from "@/lib/actions/api-keys"
import { buildAgentPromptContract } from "@/lib/server/agent-context"
import {
  inferPromptOverlays,
  resolvePromptProvider,
} from "@/lib/server/agent-prompt-steering"
import {
  AGENT_MAX_CONCURRENT_REQUESTS_PER_CLIENT,
  AGENT_RATE_LIMIT_ENABLED,
  AGENT_RATE_LIMIT_MAX_REQUESTS,
  AGENT_RATE_LIMIT_WINDOW_MS,
  AGENT_STREAM_TIMEOUT_MS,
} from "@/lib/server/agent-runtime-config"
import {
  createAuthUnavailableResponse,
  isAuthConfigured,
} from "@/lib/server/auth"
import { getRequestSession } from "@/lib/server/auth-session"
import {
  evaluateAndConsumeSlidingWindowRateLimit,
  tryAcquireConcurrencySlot,
} from "@/lib/server/rate-limit"
import { isThreadStoreNotInitializedError } from "@/lib/server/threads"
import { type ModelType, resolveDefaultModel } from "@/lib/shared/llm/models"

import {
  applyRateLimitHeaders,
  createBaseHeaders,
  createJsonErrorResponse,
  createTimeoutAbortSignal,
  isOpenRouterModel,
  resolveRateLimitIdentifier,
  resolveRequestId,
  resolveUserTimeZone,
} from "./route-helpers"
import {
  agentStreamRequestSchema,
  isConversationPayloadTooLarge,
} from "./route-schema"
import { createAgentTextStream } from "./route-stream"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  const requestId = resolveRequestId(request)

  try {
    if (!isAuthConfigured()) {
      return createAuthUnavailableResponse({ "X-Request-Id": requestId })
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY
    const tavilyApiKey = process.env.TAVILY_API_KEY
    const session = await getRequestSession(request.headers)

    if (!session) {
      return createJsonErrorResponse({
        requestId,
        error: "Unauthorized.",
        status: 401,
      })
    }

    const clientIdentifier = resolveRateLimitIdentifier(session.user.id)
    const rateLimitDecision = AGENT_RATE_LIMIT_ENABLED
      ? evaluateAndConsumeSlidingWindowRateLimit({
          identifier: clientIdentifier,
          maxRequests: AGENT_RATE_LIMIT_MAX_REQUESTS,
          windowMs: AGENT_RATE_LIMIT_WINDOW_MS,
        })
      : null

    if (rateLimitDecision && !rateLimitDecision.allowed) {
      return createJsonErrorResponse({
        requestId,
        error: "Too many requests. Please retry shortly.",
        status: 429,
        retryAfterSeconds: rateLimitDecision.retryAfterSeconds,
        rateLimitDecision,
      })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return createJsonErrorResponse({
        requestId,
        error: "Invalid JSON payload.",
        status: 400,
        rateLimitDecision: rateLimitDecision ?? undefined,
      })
    }

    const parsed = agentStreamRequestSchema.safeParse(body)

    if (!parsed.success) {
      return createJsonErrorResponse({
        requestId,
        error: "Invalid request payload.",
        status: 400,
        rateLimitDecision: rateLimitDecision ?? undefined,
      })
    }

    if (isConversationPayloadTooLarge(parsed.data.messages)) {
      return createJsonErrorResponse({
        requestId,
        error: "Conversation payload is too large.",
        status: 413,
        rateLimitDecision: rateLimitDecision ?? undefined,
      })
    }

    const lastMessage = parsed.data.messages[parsed.data.messages.length - 1]
    if (lastMessage?.role !== "user") {
      return createJsonErrorResponse({
        requestId,
        error: "The final message must be from the user.",
        status: 400,
        rateLimitDecision: rateLimitDecision ?? undefined,
      })
    }

    const selectedModel: ModelType =
      parsed.data.model ?? resolveDefaultModel(getModels())
    const useOpenRouter = isOpenRouterModel(selectedModel)

    if (!useOpenRouter) {
      return createJsonErrorResponse({
        requestId,
        error: "Unsupported model selected.",
        status: 400,
        rateLimitDecision: rateLimitDecision ?? undefined,
      })
    }

    const requestNow = new Date()
    const userTimeZone = resolveUserTimeZone(request)
    const promptProvider = resolvePromptProvider(selectedModel)
    const promptOverlays = inferPromptOverlays(parsed.data.messages)
    const promptContract = await buildAgentPromptContract(
      {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
      },
      {
        now: requestNow,
        userTimeZone,
        provider: promptProvider,
        overlays: promptOverlays,
      }
    )

    if (promptContract.portfolioContextStatus === "unavailable") {
      console.warn(
        `[agent:${requestId}] Portfolio context unavailable; continuing without saved portfolio data.`
      )
    }

    if (!openRouterApiKey) {
      return createJsonErrorResponse({
        requestId,
        error: "Missing OPENROUTER_API_KEY on the server.",
        status: 500,
        rateLimitDecision: rateLimitDecision ?? undefined,
      })
    }

    const concurrencySlot = AGENT_RATE_LIMIT_ENABLED
      ? tryAcquireConcurrencySlot({
          identifier: clientIdentifier,
          maxConcurrent: AGENT_MAX_CONCURRENT_REQUESTS_PER_CLIENT,
          windowMs: AGENT_RATE_LIMIT_WINDOW_MS,
        })
      : null

    if (concurrencySlot && !concurrencySlot.allowed) {
      return createJsonErrorResponse({
        requestId,
        error: "Too many concurrent requests. Please retry shortly.",
        status: 429,
        retryAfterSeconds: concurrencySlot.retryAfterSeconds,
        rateLimitDecision: rateLimitDecision ?? undefined,
      })
    }

    const streamSignal = createTimeoutAbortSignal(
      request,
      AGENT_STREAM_TIMEOUT_MS
    )
    let releasedConcurrencySlot = false
    const releaseConcurrencySlot = () => {
      if (releasedConcurrencySlot) {
        return
      }

      releasedConcurrencySlot = true
      concurrencySlot?.release()
    }

    const textStream = createAgentTextStream({
      request,
      requestId,
      selectedModel,
      openRouterApiKey,
      tavilyApiKey,
      messages: [...promptContract.preludeMessages, ...parsed.data.messages],
      systemInstruction: promptContract.systemInstruction,
      streamSignal,
      releaseConcurrencySlot,
    })

    const responseHeaders = createBaseHeaders(requestId)
    responseHeaders.set("Content-Type", "application/x-ndjson; charset=utf-8")
    responseHeaders.set("Cache-Control", "no-store, no-transform")
    if (rateLimitDecision) {
      applyRateLimitHeaders(responseHeaders, rateLimitDecision)
    }

    return new Response(textStream, {
      headers: responseHeaders,
    })
  } catch (error) {
    if (isThreadStoreNotInitializedError(error)) {
      return createJsonErrorResponse({
        requestId,
        error: error.message,
        status: 500,
      })
    }

    console.error(`[agent:${requestId}] Agent request failed:`, error)
    return createJsonErrorResponse({
      requestId,
      error: "Failed to generate agent response.",
      status: 500,
    })
  }
}
