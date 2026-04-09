import { z } from "zod"

import {
  AGENT_MAX_MESSAGE_CHARS,
  AGENT_MAX_MESSAGES,
  AGENT_MAX_TOTAL_CHARS,
} from "@/lib/server/agent-runtime-config"
import { ALL_MODELS, migrateModelId } from "@/lib/shared/llm/models"

export const allowedModels = ALL_MODELS

const agentMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(AGENT_MAX_MESSAGE_CHARS),
  })
  .strict()

export const agentStreamRequestSchema = z
  .object({
    model: z
      .preprocess(
        (val) => (typeof val === "string" ? migrateModelId(val) : val),
        z.enum(allowedModels)
      )
      .optional(),
    messages: z.array(agentMessageSchema).min(1).max(AGENT_MAX_MESSAGES),
  })
  .strict()

export type AgentStreamRequest = z.infer<typeof agentStreamRequestSchema>

export function getTotalMessageChars(
  messages: AgentStreamRequest["messages"]
): number {
  return messages.reduce((total, message) => total + message.content.length, 0)
}

export function isConversationPayloadTooLarge(
  messages: AgentStreamRequest["messages"]
): boolean {
  return getTotalMessageChars(messages) > AGENT_MAX_TOTAL_CHARS
}
