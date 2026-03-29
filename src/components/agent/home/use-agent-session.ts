import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

import type { Message as AgentMessage } from "@/lib/shared/agent/messages"
import type { ModelType } from "@/lib/shared/llm/models"
import type { Thread } from "@/lib/shared/threads"

import {
  buildAssistantMessage,
  CLIENT_MESSAGE_MAX_CHARS,
  createErrorAssistantMessage,
  createThreadSnapshot,
  type EditMessageParams,
  ensureAssistantContent,
  handleUnauthorizedAgentResponse,
  INITIAL_STATE,
  type QueuedSubmission,
  upsertMessageById,
} from "./agent-session-helpers"
import { runAgentStreamRequest } from "./agent-session-request"
import type { AgentStreamAccumulator } from "./agent-stream-state"
import {
  appendUserMessage,
  createClientMessageId,
  toRequestMessages,
} from "./home-agent-utils"
import { useThreads } from "./threads-context"

function findThread(threads: Thread[], threadId: string) {
  return threads.find((thread) => thread.id === threadId)
}

export function useAgentSession() {
  const {
    currentThreadId,
    setCurrentThreadId: baseSetCurrentThreadId,
    saveThread,
    threads,
    deleteThread,
  } = useThreads()

  const [state, setState] = useState(INITIAL_STATE)
  const [queuedSubmission, setQueuedSubmission] =
    useState<QueuedSubmission | null>(null)
  const submitLockRef = useRef(false)
  const messagesRef = useRef<AgentMessage[]>([])
  const abortControllerRef = useRef<AbortController | null>(null)
  const currentThreadIdRef = useRef(currentThreadId)

  const setCurrentThreadId = useCallback(
    (id: string | null) => {
      currentThreadIdRef.current = id
      baseSetCurrentThreadId(id)
    },
    [baseSetCurrentThreadId]
  )

  const createSnapshot = useCallback(
    (threadId: string, messages: AgentMessage[], model: ModelType): Thread =>
      createThreadSnapshot({
        threadId,
        messages,
        model,
        existingThread: findThread(threads, threadId),
      }),
    [threads]
  )

  const persistMessages = useCallback(
    (
      threadId: string | null,
      messages: AgentMessage[],
      model: ModelType,
      immediate: boolean
    ) => {
      if (!threadId) {
        return
      }

      saveThread(createSnapshot(threadId, messages, model), { immediate })
    },
    [createSnapshot, saveThread]
  )

  const setMessagesState = useCallback(
    (
      messages: AgentMessage[],
      streamFlags: {
        isSubmitting: boolean
        isStreaming: boolean
      }
    ) => {
      messagesRef.current = messages
      setState({
        messages,
        isSubmitting: streamFlags.isSubmitting,
        isStreaming: streamFlags.isStreaming,
      })
    },
    []
  )

  const upsertAssistantAccumulator = useCallback(
    (params: {
      activeThreadId: string | null
      assistantId: string
      assistantCreatedAt: string
      accumulator: AgentStreamAccumulator
      model: ModelType
      streamFlags: {
        isSubmitting: boolean
        isStreaming: boolean
      }
    }) => {
      if (params.activeThreadId !== currentThreadIdRef.current) {
        return
      }

      const assistantMessage = buildAssistantMessage({
        accumulator: params.accumulator,
        assistantId: params.assistantId,
        assistantCreatedAt: params.assistantCreatedAt,
        model: params.model,
        isStreaming: params.streamFlags.isStreaming,
      })
      const updatedMessages = upsertMessageById(
        messagesRef.current,
        assistantMessage
      )

      persistMessages(
        params.activeThreadId,
        updatedMessages,
        params.model,
        !params.streamFlags.isStreaming
      )
      setMessagesState(updatedMessages, params.streamFlags)
    },
    [persistMessages, setMessagesState]
  )

  useEffect(() => {
    if (currentThreadId !== currentThreadIdRef.current) {
      currentThreadIdRef.current = currentThreadId
    }
  }, [currentThreadId])

  const streamingState = state.isSubmitting || state.isStreaming
  const activeThread = currentThreadId
    ? findThread(threads, currentThreadId)
    : undefined

  useEffect(() => {
    if (submitLockRef.current) {
      return
    }

    if (currentThreadId) {
      if (!activeThread) {
        return
      }

      setMessagesState(activeThread.messages, {
        isSubmitting: false,
        isStreaming: false,
      })
      return
    }

    setMessagesState([], {
      isSubmitting: false,
      isStreaming: false,
    })
  }, [activeThread, currentThreadId, setMessagesState])

  useEffect(() => {
    messagesRef.current = state.messages
  }, [state.messages])

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort()
      abortControllerRef.current = null
      submitLockRef.current = false
    }
  }, [])

  const resetConversation = useCallback(() => {
    if (submitLockRef.current && currentThreadIdRef.current) {
      if (messagesRef.current.length <= 2) {
        deleteThread(currentThreadIdRef.current)
      }
    }

    abortControllerRef.current?.abort()
    abortControllerRef.current = null
    setQueuedSubmission(null)
    setState(INITIAL_STATE)
    messagesRef.current = []
    currentThreadIdRef.current = null
    submitLockRef.current = false
    setCurrentThreadId(null)
  }, [deleteThread, setCurrentThreadId])

  const clearQueuedSubmission = useCallback(() => {
    setQueuedSubmission(null)
  }, [])

  const handleStopStream = useCallback(() => {
    if (!submitLockRef.current) {
      return
    }

    abortControllerRef.current?.abort()
  }, [])

  const runAgentRequest = useCallback(
    async (nextMessages: AgentMessage[], model: ModelType) => {
      if (submitLockRef.current) {
        return false
      }

      const abortController = new AbortController()
      abortControllerRef.current = abortController
      submitLockRef.current = true
      messagesRef.current = nextMessages

      let activeThreadId = currentThreadIdRef.current
      if (!activeThreadId) {
        activeThreadId = crypto.randomUUID()
        setCurrentThreadId(activeThreadId)
      }

      setMessagesState(nextMessages, {
        isSubmitting: true,
        isStreaming: false,
      })
      persistMessages(activeThreadId, nextMessages, model, true)

      const assistantId = createClientMessageId()
      const assistantCreatedAt = new Date().toISOString()

      try {
        const outcome = await runAgentStreamRequest({
          signal: abortController.signal,
          model,
          requestMessages: toRequestMessages(nextMessages),
          onProgress: ({ accumulator, isSubmitting, isStreaming }) => {
            upsertAssistantAccumulator({
              activeThreadId,
              assistantId,
              assistantCreatedAt,
              accumulator,
              model,
              streamFlags: { isSubmitting, isStreaming },
            })
          },
        })

        if (outcome.kind === "unauthorized") {
          handleUnauthorizedAgentResponse(nextMessages, setState)
          return true
        }

        if (outcome.kind === "completed") {
          upsertAssistantAccumulator({
            activeThreadId,
            assistantId,
            assistantCreatedAt,
            accumulator: ensureAssistantContent(outcome.accumulator),
            model,
            streamFlags: { isSubmitting: false, isStreaming: false },
          })
          return true
        }

        if (outcome.kind === "aborted") {
          if (outcome.accumulator.content.trim()) {
            upsertAssistantAccumulator({
              activeThreadId,
              assistantId,
              assistantCreatedAt,
              accumulator: outcome.accumulator,
              model,
              streamFlags: { isSubmitting: false, isStreaming: false },
            })
            return true
          }

          if (activeThreadId === currentThreadIdRef.current) {
            setState((prev) => ({
              ...prev,
              isSubmitting: false,
              isStreaming: false,
            }))
          }
          return true
        }

        if (activeThreadId !== currentThreadIdRef.current) {
          return true
        }

        toast.error("Failed to send message", {
          description: outcome.errorMessage,
        })

        const updatedMessages = [
          ...messagesRef.current,
          createErrorAssistantMessage(outcome.errorMessage, model),
        ]
        persistMessages(activeThreadId, updatedMessages, model, true)
        setMessagesState(updatedMessages, {
          isSubmitting: false,
          isStreaming: false,
        })
        return true
      } finally {
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null
          submitLockRef.current = false
        }
      }
    },
    [
      persistMessages,
      setCurrentThreadId,
      setMessagesState,
      upsertAssistantAccumulator,
    ]
  )

  const handleSubmit = useCallback(
    async (message: string, model: ModelType) => {
      const trimmedMessage = message.trim()
      if (!trimmedMessage) {
        return
      }

      if (trimmedMessage.length > CLIENT_MESSAGE_MAX_CHARS) {
        toast.error("Message too long", {
          description: `Please keep messages under ${String(CLIENT_MESSAGE_MAX_CHARS)} characters.`,
        })
        return
      }

      const nextMessages = appendUserMessage(
        messagesRef.current,
        trimmedMessage,
        model
      )

      await runAgentRequest(nextMessages, model)
    },
    [runAgentRequest]
  )

  const handleEditMessage = useCallback(
    ({ messageId, newContent, newModel }: EditMessageParams) => {
      const trimmedContent = newContent.trim()
      const currentMessages = messagesRef.current

      const messageIndex = currentMessages.findIndex(
        (message) => message.id === messageId && message.role === "user"
      )

      if (messageIndex === -1) {
        throw new Error("Message not found")
      }

      if (!trimmedContent) {
        throw new Error("Message cannot be empty")
      }

      if (trimmedContent.length > CLIENT_MESSAGE_MAX_CHARS) {
        throw new Error(
          `Message must be ${String(CLIENT_MESSAGE_MAX_CHARS)} characters or fewer.`
        )
      }

      const nextMessages = currentMessages.slice(0, messageIndex + 1)
      const targetMessage = nextMessages[messageIndex]

      if (targetMessage?.role !== "user") {
        throw new Error("Message not editable")
      }

      nextMessages[messageIndex] = {
        ...targetMessage,
        content: trimmedContent,
        llmModel: newModel,
        metadata: {
          ...targetMessage.metadata,
          selectedModel: newModel,
        },
      }

      if (submitLockRef.current) {
        throw new Error("Please wait for the current response to finish.")
      }

      persistMessages(currentThreadIdRef.current, nextMessages, newModel, true)
      void runAgentRequest(nextMessages, newModel)
    },
    [persistMessages, runAgentRequest]
  )

  const handlePromptSubmit = useCallback(
    (message: string, model: ModelType, queue: boolean) => {
      const trimmedMessage = message.trim()
      if (!trimmedMessage) {
        return
      }

      if (queue && submitLockRef.current) {
        setQueuedSubmission({
          message: trimmedMessage,
          model,
        })
        return
      }

      void handleSubmit(trimmedMessage, model)
    },
    [handleSubmit]
  )

  useEffect(() => {
    if (streamingState || submitLockRef.current || !queuedSubmission) {
      return
    }

    setQueuedSubmission(null)
    void handleSubmit(queuedSubmission.message, queuedSubmission.model)
  }, [streamingState, queuedSubmission, handleSubmit])

  return {
    state,
    queuedSubmission,
    streamingState,
    resetConversation,
    clearQueuedSubmission,
    handleStopStream,
    handlePromptSubmit,
    handleEditMessage,
  }
}
