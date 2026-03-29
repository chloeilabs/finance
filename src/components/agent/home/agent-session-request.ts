import { isAbortError } from "@/lib/cast"
import type { ModelType } from "@/lib/shared/llm/models"

import { createAgentRequestHeaders } from "./agent-session-helpers"
import {
  getResponseErrorMessage,
  parseStreamEventLine,
  readResponseStreamLines,
} from "./agent-stream-events"
import {
  type AgentStreamAccumulator,
  appendRawStreamText,
  applyAgentStreamEvent,
  createAgentStreamAccumulator,
  finalizeAgentStreamAccumulator,
  hasAgentStreamOutput,
} from "./agent-stream-state"

interface StreamProgress {
  accumulator: AgentStreamAccumulator
  isSubmitting: boolean
  isStreaming: boolean
}

type AgentRequestOutcome =
  | { kind: "unauthorized" }
  | { kind: "completed"; accumulator: AgentStreamAccumulator }
  | { kind: "aborted"; accumulator: AgentStreamAccumulator }
  | { kind: "error"; errorMessage: string }

export async function runAgentStreamRequest(params: {
  signal: AbortSignal
  model: ModelType
  requestMessages: unknown
  onProgress: (update: StreamProgress) => void
}): Promise<AgentRequestOutcome> {
  let accumulator = createAgentStreamAccumulator()

  const processLine = (line: string, appendNewline: boolean) => {
    const normalizedLine = line.endsWith("\r") ? line.slice(0, -1) : line
    const parsedEvent = parseStreamEventLine(normalizedLine)

    accumulator = parsedEvent
      ? applyAgentStreamEvent(accumulator, parsedEvent)
      : appendRawStreamText(
          accumulator,
          appendNewline ? `${normalizedLine}\n` : normalizedLine
        )

    params.onProgress({
      accumulator,
      isSubmitting: false,
      isStreaming: true,
    })
  }

  let response: Response
  try {
    response = await fetch("/api/agent", {
      method: "POST",
      headers: createAgentRequestHeaders(),
      signal: params.signal,
      body: JSON.stringify({
        model: params.model,
        messages: params.requestMessages,
      }),
    })
  } catch (requestError) {
    if (isAbortError(requestError)) {
      return {
        kind: "aborted",
        accumulator: finalizeAgentStreamAccumulator(accumulator, "error"),
      }
    }

    return {
      kind: "error",
      errorMessage:
        requestError instanceof Error && requestError.message.trim()
          ? requestError.message
          : "Sorry, the response was interrupted.",
    }
  }

  if (response.status === 401) {
    return { kind: "unauthorized" }
  }

  if (!response.ok || !response.body) {
    return {
      kind: "error",
      errorMessage: await getResponseErrorMessage(response),
    }
  }

  try {
    await readResponseStreamLines(response.body, processLine)
  } catch (streamError) {
    if (isAbortError(streamError)) {
      return {
        kind: "aborted",
        accumulator: finalizeAgentStreamAccumulator(accumulator, "error"),
      }
    }

    accumulator = finalizeAgentStreamAccumulator(accumulator, "error")

    if (hasAgentStreamOutput(accumulator)) {
      return { kind: "completed", accumulator }
    }

    return {
      kind: "error",
      errorMessage: "Sorry, the response was interrupted.",
    }
  }

  return {
    kind: "completed",
    accumulator: finalizeAgentStreamAccumulator(accumulator, "success"),
  }
}
