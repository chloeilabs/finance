import type {
  ActivityTimelineEntry,
  AgentRunStatus,
  AgentStreamEvent,
  MessageSource,
  ToolInvocation,
} from "@/lib/shared/agent/messages"

export type ToolCallEvent = Extract<AgentStreamEvent, { type: "tool_call" }>
export type ToolResultEvent = Extract<
  AgentStreamEvent,
  { type: "tool_result" }
>
export type ToolActivityTimelineEntry = Extract<
  ActivityTimelineEntry,
  { kind: "tool" }
>
export type SearchActivityTimelineEntry = Extract<
  ActivityTimelineEntry,
  { kind: "search" }
>
export type SourcesActivityTimelineEntry = Extract<
  ActivityTimelineEntry,
  { kind: "sources" }
>
export type ReasoningActivityTimelineEntry = Extract<
  ActivityTimelineEntry,
  { kind: "reasoning" }
>

export interface AgentStreamAccumulator {
  content: string
  reasoning: string
  agentStatus?: AgentRunStatus
  interactionId?: string
  lastEventId?: string
  toolInvocations: ToolInvocation[]
  activityTimeline: ActivityTimelineEntry[]
  sources: MessageSource[]
  nextActivityOrder: number
}
