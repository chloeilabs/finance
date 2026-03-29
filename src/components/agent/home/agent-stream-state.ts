import {
  type AgentStreamEvent,
} from "@/lib/shared/agent/messages"

import {
  appendReasoningToTimeline,
  applyToolResultToInvocations,
  applyToolResultToTimeline,
  finalizeRunningInvocations,
  finalizeRunningTimelineToolEntries,
  getCheckpointFields,
  upsertSource,
  upsertSourcesTimelineFromSource,
  upsertToolInvocationFromCall,
  upsertToolTimelineFromCall,
} from "./agent-stream-helpers"
import type { AgentStreamAccumulator } from "./agent-stream-types"

export type { AgentStreamAccumulator } from "./agent-stream-types"

export function createAgentStreamAccumulator(): AgentStreamAccumulator {
  return {
    content: "",
    reasoning: "",
    agentStatus: undefined,
    interactionId: undefined,
    lastEventId: undefined,
    toolInvocations: [],
    activityTimeline: [],
    sources: [],
    nextActivityOrder: 0,
  }
}

export function appendRawStreamText(
  current: AgentStreamAccumulator,
  text: string
): AgentStreamAccumulator {
  if (text.length === 0) {
    return current
  }

  return {
    ...current,
    content: `${current.content}${text}`,
  }
}

export function applyAgentStreamEvent(
  current: AgentStreamAccumulator,
  event: AgentStreamEvent
): AgentStreamAccumulator {
  const checkpointFields = getCheckpointFields(current, event)
  let nextActivityOrder = current.nextActivityOrder
  const nextOrder = () => {
    const next = nextActivityOrder
    nextActivityOrder += 1
    return next
  }

  if (event.type === "text_delta") {
    return {
      ...current,
      ...checkpointFields,
      content: `${current.content}${event.delta}`,
    }
  }

  if (event.type === "source") {
    const nextSources = upsertSource(current.sources, event.source)
    return {
      ...current,
      ...checkpointFields,
      sources: nextSources,
      activityTimeline: upsertSourcesTimelineFromSource(
        current.activityTimeline,
        event.source,
        nextOrder
      ),
      nextActivityOrder,
    }
  }

  if (event.type === "agent_status") {
    return {
      ...current,
      ...checkpointFields,
      agentStatus: event.status,
    }
  }

  if (event.type === "reasoning_delta") {
    return {
      ...current,
      ...checkpointFields,
      reasoning: `${current.reasoning}${event.delta}`,
      activityTimeline: appendReasoningToTimeline(
        current.activityTimeline,
        event.delta,
        nextOrder
      ),
      nextActivityOrder,
    }
  }

  if (event.type === "tool_call") {
    return {
      ...current,
      ...checkpointFields,
      toolInvocations: upsertToolInvocationFromCall(
        current.toolInvocations,
        event
      ),
      activityTimeline: upsertToolTimelineFromCall(
        current.activityTimeline,
        event,
        nextOrder
      ),
      nextActivityOrder,
    }
  }

  return {
    ...current,
    ...checkpointFields,
    toolInvocations: applyToolResultToInvocations(
      current.toolInvocations,
      event
    ),
    activityTimeline: applyToolResultToTimeline(
      current.activityTimeline,
      event
    ),
  }
}

export function finalizeAgentStreamAccumulator(
  current: AgentStreamAccumulator,
  status: "success" | "error"
): AgentStreamAccumulator {
  return {
    ...current,
    toolInvocations: finalizeRunningInvocations(
      current.toolInvocations,
      status
    ),
    activityTimeline: finalizeRunningTimelineToolEntries(
      current.activityTimeline,
      status
    ),
  }
}

export function hasAgentStreamOutput(current: AgentStreamAccumulator): boolean {
  return Boolean(
    current.content.trim() ||
    current.reasoning.trim() ||
    current.agentStatus != null ||
    current.toolInvocations.length > 0 ||
    current.activityTimeline.length > 0 ||
    current.sources.length > 0
  )
}
