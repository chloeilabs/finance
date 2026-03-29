import { redirectToSignIn } from "@/lib/auth-client"
import type { Message as AgentMessage } from "@/lib/shared/agent/messages"
import type { ModelType } from "@/lib/shared/llm/models"
import { deriveThreadTitle, type Thread } from "@/lib/shared/threads"

import type { AgentStreamAccumulator } from "./agent-stream-state"
import {
  createClientMessageId,
  EMPTY_ASSISTANT_RESPONSE_FALLBACK,
} from "./home-agent-utils"

export const CLIENT_MESSAGE_MAX_CHARS = 16_000

export interface AgentSessionState {
  messages: AgentMessage[]
  isSubmitting: boolean
  isStreaming: boolean
}

export interface EditMessageParams {
  messageId: string
  newContent: string
  newModel: ModelType
}

export interface QueuedSubmission {
  message: string
  model: ModelType
}

export const INITIAL_STATE: AgentSessionState = {
  messages: [],
  isSubmitting: false,
  isStreaming: false,
}

export function createAgentRequestHeaders(): HeadersInit {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone.trim()

    return {
      "Content-Type": "application/json",
      ...(timeZone ? { "X-User-Timezone": timeZone } : {}),
    }
  } catch {
    return {
      "Content-Type": "application/json",
    }
  }
}

export function createThreadSnapshot(params: {
  threadId: string
  messages: AgentMessage[]
  model: ModelType
  existingThread?: Thread
}): Thread {
  const nextDerivedTitle = deriveThreadTitle(params.messages)
  const previousDerivedTitle = params.existingThread
    ? deriveThreadTitle(params.existingThread.messages)
    : nextDerivedTitle
  const existingTitle = params.existingThread?.title.trim() ?? ""
  const hasCustomTitle =
    existingTitle !== "" && existingTitle !== previousDerivedTitle

  return {
    id: params.threadId,
    title: hasCustomTitle ? existingTitle : nextDerivedTitle,
    messages: params.messages,
    model: params.model,
    isPinned: params.existingThread?.isPinned ?? false,
    metadata: params.existingThread?.metadata,
    createdAt:
      params.existingThread?.createdAt ??
      params.messages[0]?.createdAt ??
      new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function buildAssistantMessage(params: {
  accumulator: AgentStreamAccumulator
  assistantId: string
  assistantCreatedAt: string
  model: ModelType
  isStreaming: boolean
}): AgentMessage {
  const { accumulator } = params

  return {
    id: params.assistantId,
    role: "assistant",
    content: accumulator.content,
    llmModel: params.model,
    createdAt: params.assistantCreatedAt,
    metadata: {
      isStreaming: params.isStreaming,
      parts: [{ type: "text", text: accumulator.content }],
      ...(accumulator.reasoning.trim().length > 0
        ? { reasoning: accumulator.reasoning }
        : {}),
      ...(accumulator.toolInvocations.length > 0
        ? { toolInvocations: accumulator.toolInvocations }
        : {}),
      ...(accumulator.activityTimeline.length > 0
        ? { activityTimeline: accumulator.activityTimeline }
        : {}),
      ...(accumulator.sources.length > 0
        ? { sources: accumulator.sources }
        : {}),
    },
  }
}

export function upsertMessageById(
  messages: AgentMessage[],
  message: AgentMessage
): AgentMessage[] {
  const existingIndex = messages.findIndex(
    (candidate) => candidate.id === message.id
  )

  if (existingIndex === -1) {
    return [...messages, message]
  }

  return messages.map((candidate) =>
    candidate.id === message.id ? message : candidate
  )
}

export function createErrorAssistantMessage(
  errorMessage: string,
  model: ModelType
): AgentMessage {
  const content = `Sorry, I hit an error: ${errorMessage}`

  return {
    id: createClientMessageId(),
    role: "assistant",
    content,
    llmModel: model,
    createdAt: new Date().toISOString(),
    metadata: {
      isStreaming: false,
      parts: [{ type: "text", text: content }],
    },
  }
}

export function ensureAssistantContent(
  accumulator: AgentStreamAccumulator
): AgentStreamAccumulator {
  if (accumulator.content.trim()) {
    return accumulator
  }

  return {
    ...accumulator,
    content: EMPTY_ASSISTANT_RESPONSE_FALLBACK,
  }
}

export function handleUnauthorizedAgentResponse(
  nextMessages: AgentMessage[],
  setState: (next: AgentSessionState) => void
) {
  setState({
    messages: nextMessages,
    isSubmitting: false,
    isStreaming: false,
  })
  redirectToSignIn()
}
