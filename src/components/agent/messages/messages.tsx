import { memo, useMemo } from "react"

import {
  isAssistantMessage,
  isUserMessage,
  type Message,
  type ModelType,
} from "@/lib/shared"

import { AssistantMessage, CraftingShimmer } from "./assistant-message"
import { UserMessage } from "./user-message"

function groupMessages(messages: Message[]) {
  const groups: Message[][] = []
  let currentGroup: Message[] = []

  for (const message of messages) {
    if (isUserMessage(message)) {
      if (
        currentGroup.length > 0 &&
        currentGroup[0] &&
        isUserMessage(currentGroup[0])
      ) {
        groups.push([...currentGroup])
        currentGroup = [message]
      } else {
        currentGroup.push(message)
      }
      continue
    }

    if (isAssistantMessage(message)) {
      if (
        currentGroup.length > 0 &&
        currentGroup[0] &&
        isAssistantMessage(currentGroup[0])
      ) {
        groups.push([...currentGroup])
        currentGroup = [message]
      } else {
        currentGroup.push(message)
        if (currentGroup.length === 2) {
          groups.push([...currentGroup])
          currentGroup = []
        }
      }
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

function getMessageContent(message: Message): string {
  const parts = message.metadata?.parts ?? []
  if (parts.length === 0) return message.content
  const text = parts.map((p) => ("text" in p ? p.text : "")).join("")
  return text.length > 0 ? text : message.content
}

function MessagesComponent({
  messages,
  disableEditing,
  onEditMessage,
  isStreamPending,
  userMessageLayout = "bubble",
  assistantMessageLayout = "default",
}: {
  messages: Message[]
  disableEditing: boolean
  onEditMessage?: (params: {
    messageId: string
    newContent: string
    newModel: ModelType
  }) => Promise<void> | void
  isStreamPending: boolean
  userMessageLayout?: "bubble" | "fullWidth"
  assistantMessageLayout?: "default" | "fullWidth"
}) {
  const messageGroups = useMemo(() => groupMessages(messages), [messages])

  const hasStreamingAssistantWithNoContent = useMemo(() => {
    return messages.some((m) => {
      if (!isAssistantMessage(m)) return false
      if (m.metadata?.isStreaming !== true) return false
      return !getMessageContent(m).trim()
    })
  }, [messages])

  return (
    <div className="relative z-0 mb-10 flex w-full grow flex-col gap-6">
      {messageGroups.map((messageGroup, groupIndex) => {
        const isLastGroup = groupIndex === messageGroups.length - 1
        const lastMessage = messageGroup[messageGroup.length - 1]
        const endsWithUserMessage =
          lastMessage !== undefined && isUserMessage(lastMessage)
        const shouldShowGenerating =
          isLastGroup &&
          endsWithUserMessage &&
          isStreamPending &&
          !hasStreamingAssistantWithNoContent

        return (
          <div className="flex w-full min-w-0 flex-col gap-6" key={groupIndex}>
            {messageGroup.map((message) => {
              if (isUserMessage(message)) {
                return (
                  <UserMessage
                    key={message.id}
                    message={message}
                    isFirstMessage={groupIndex === 0}
                    disableEditing={disableEditing}
                    onEditMessage={onEditMessage}
                    layout={userMessageLayout}
                  />
                )
              }

              if (isAssistantMessage(message)) {
                return (
                  <AssistantMessage
                    key={message.id}
                    message={message}
                    layout={assistantMessageLayout}
                  />
                )
              }

              return null
            })}

            {shouldShowGenerating ? (
              <CraftingShimmer
                key={`crafting-${String(groupIndex)}`}
                layout={assistantMessageLayout}
              />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export const Messages = memo(MessagesComponent)
