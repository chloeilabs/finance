import { type NextRequest } from "next/server"

import { isAbortError } from "@/lib/cast"
import { ASSISTANT_EMPTY_RESPONSE_FALLBACK } from "@/lib/constants"
import { startOpenRouterResponseStream } from "@/lib/server/llm/openrouter-responses"
import { withAiSdkInlineCitationInstruction } from "@/lib/server/llm/system-instruction-augmentations"
import type { AgentStreamEvent } from "@/lib/shared/agent/messages"
import type { ModelType } from "@/lib/shared/llm/models"

import {
  isProviderAuthenticationError,
  STREAM_ERROR_FALLBACK_TEXT,
  STREAM_TIMEOUT_FALLBACK_TEXT,
  textDeltaEvent,
} from "./route-helpers"

interface AgentTextStreamMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface CreateAgentTextStreamParams {
  request: NextRequest
  requestId: string
  selectedModel: ModelType
  openRouterApiKey: string
  tavilyApiKey?: string
  messages: readonly AgentTextStreamMessage[]
  systemInstruction: string
  streamSignal: AbortSignal
  releaseConcurrencySlot: () => void
}

export function createAgentTextStream(
  params: CreateAgentTextStreamParams
): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  let streamClosed = false

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      let hasTextChunk = false
      let hasMeaningfulText = false

      const closeController = () => {
        if (streamClosed) {
          return
        }

        streamClosed = true
        try {
          controller.close()
        } catch {}
      }

      const enqueueEvent = (event: AgentStreamEvent) => {
        if (streamClosed) {
          return
        }

        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`))
        } catch {
          streamClosed = true
        }
      }

      try {
        const handleEvent = (event: AgentStreamEvent) => {
          if (event.type === "text_delta") {
            hasTextChunk = true
            if (event.delta.trim().length > 0) {
              hasMeaningfulText = true
            }
          }

          enqueueEvent(event)
        }

        const stream = startOpenRouterResponseStream({
          model: params.selectedModel,
          openRouterApiKey: params.openRouterApiKey,
          tavilyApiKey: params.tavilyApiKey,
          messages: params.messages,
          systemInstruction: withAiSdkInlineCitationInstruction(
            params.systemInstruction
          ),
          signal: params.streamSignal,
        })

        for await (const event of stream) {
          handleEvent(event)
        }

        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stream may finish with no text
        if (!hasMeaningfulText) {
          hasTextChunk = true
          hasMeaningfulText = true
          enqueueEvent(textDeltaEvent(ASSISTANT_EMPTY_RESPONSE_FALLBACK))
        }
      } catch (streamError) {
        const clientAborted = params.request.signal.aborted

        if (isAbortError(streamError)) {
          if (!clientAborted) {
            console.warn(
              `[agent:${params.requestId}] Agent stream aborted by timeout.`
            )
          }

          if (!clientAborted && !hasMeaningfulText) {
            hasTextChunk = true
            hasMeaningfulText = true
            enqueueEvent(textDeltaEvent(STREAM_TIMEOUT_FALLBACK_TEXT))
          }
        } else if (
          isProviderAuthenticationError(streamError) &&
          !hasMeaningfulText
        ) {
          console.error(
            `[agent:${params.requestId}] OpenRouter authentication failed:`,
            streamError
          )
          hasTextChunk = true
          hasMeaningfulText = true
          enqueueEvent(
            textDeltaEvent("Invalid OPENROUTER_API_KEY on the server.")
          )
        } else if (!hasMeaningfulText) {
          console.error(
            `[agent:${params.requestId}] Agent stream failed:`,
            streamError
          )
          hasTextChunk = true
          hasMeaningfulText = true
          enqueueEvent(textDeltaEvent(STREAM_ERROR_FALLBACK_TEXT))
        } else if (!hasTextChunk) {
          console.error(
            `[agent:${params.requestId}] Agent stream failed:`,
            streamError
          )
          hasTextChunk = true
          enqueueEvent(textDeltaEvent(ASSISTANT_EMPTY_RESPONSE_FALLBACK))
        } else {
          console.error(
            `[agent:${params.requestId}] Agent stream failed:`,
            streamError
          )
        }
      } finally {
        params.releaseConcurrencySlot()
        closeController()
      }
    },
    cancel() {
      streamClosed = true
      params.releaseConcurrencySlot()
    },
  })
}
