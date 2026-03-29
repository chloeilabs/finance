import {
  type ActivityTimelineEntry,
  type AgentStreamEvent,
  isSearchToolName,
  type MessageSource,
  type ToolInvocation,
} from "@/lib/shared/agent/messages"

import type {
  AgentStreamAccumulator,
  ReasoningActivityTimelineEntry,
  SearchActivityTimelineEntry,
  SourcesActivityTimelineEntry,
  ToolActivityTimelineEntry,
  ToolCallEvent,
  ToolResultEvent,
} from "./agent-stream-types"
import { createClientMessageId } from "./home-agent-utils"

export function getSearchQueryFromToolCall(
  event: ToolCallEvent
): string | null {
  if (!isSearchToolName(event.toolName)) {
    return null
  }

  const normalizedQuery = event.query?.trim()
  if (normalizedQuery) {
    return normalizedQuery
  }

  const normalizedLabel = event.label.trim()
  return normalizedLabel.length > 0 ? normalizedLabel : null
}

export function getCheckpointFields(
  current: AgentStreamAccumulator,
  event: AgentStreamEvent
): Pick<AgentStreamAccumulator, "interactionId" | "lastEventId"> {
  return {
    interactionId: event.interactionId ?? current.interactionId,
    lastEventId: event.lastEventId ?? current.lastEventId,
  }
}

export function upsertToolInvocationFromCall(
  current: ToolInvocation[],
  event: ToolCallEvent
): ToolInvocation[] {
  const searchQuery = getSearchQueryFromToolCall(event)
  const existingIndex =
    event.callId !== null
      ? current.findIndex((invocation) => invocation.callId === event.callId)
      : current.findIndex(
          (invocation) =>
            invocation.callId === null &&
            invocation.toolName === event.toolName &&
            (searchQuery
              ? invocation.query === searchQuery
              : invocation.label === event.label)
        )

  if (existingIndex === -1) {
    return [
      ...current,
      {
        id: createClientMessageId(),
        callId: event.callId,
        toolName: event.toolName,
        label: event.label,
        ...(searchQuery ? { query: searchQuery } : {}),
        status: "running",
      },
    ]
  }

  const existing = current[existingIndex]
  if (!existing) {
    return current
  }

  const nextStatus =
    existing.status === "success" || existing.status === "error"
      ? existing.status
      : "running"

  const nextInvocation: ToolInvocation = {
    ...existing,
    toolName: event.toolName,
    label: event.label,
    callId: event.callId,
    ...((searchQuery ?? existing.query)
      ? { query: searchQuery ?? existing.query }
      : {}),
    status: nextStatus,
  }

  const updated = [...current]
  updated[existingIndex] = nextInvocation
  return updated
}

export function applyToolResultToInvocations(
  current: ToolInvocation[],
  event: ToolResultEvent
): ToolInvocation[] {
  const targetIndex =
    event.callId !== null
      ? findLastIndexBy(
          current,
          (invocation) => invocation.callId === event.callId
        )
      : findLastIndexBy(
          current,
          (invocation) => invocation.status === "running"
        )

  if (targetIndex === -1) {
    return current
  }

  const target = current[targetIndex]
  if (!target || target.status === event.status) {
    return current
  }

  const updated = [...current]
  updated[targetIndex] = { ...target, status: event.status }
  return updated
}

export function finalizeRunningInvocations(
  current: ToolInvocation[],
  status: "success" | "error"
): ToolInvocation[] {
  if (!current.some((invocation) => invocation.status === "running")) {
    return current
  }

  return current.map((invocation) =>
    invocation.status === "running" ? { ...invocation, status } : invocation
  )
}

export function upsertToolTimelineFromCall(
  current: ActivityTimelineEntry[],
  event: ToolCallEvent,
  nextOrder: () => number
): ActivityTimelineEntry[] {
  const searchQuery = getSearchQueryFromToolCall(event)
  if (isSearchToolName(event.toolName) && searchQuery) {
    const existingIndex =
      event.callId !== null
        ? current.findIndex(
            (entry) =>
              entry.kind === "search" &&
              entry.callId !== null &&
              entry.callId === event.callId
          )
        : current.findIndex(
            (entry) =>
              entry.kind === "search" &&
              entry.callId === null &&
              entry.toolName === event.toolName &&
              entry.query === searchQuery
          )

    if (existingIndex === -1) {
      const nextEntry: SearchActivityTimelineEntry = {
        id: createClientMessageId(),
        kind: "search",
        order: nextOrder(),
        createdAt: new Date().toISOString(),
        callId: event.callId,
        toolName: event.toolName,
        query: searchQuery,
        status: "running",
      }

      return [...current, nextEntry]
    }

    const existing = current[existingIndex]
    if (existing?.kind !== "search") {
      return current
    }

    const nextStatus =
      existing.status === "success" || existing.status === "error"
        ? existing.status
        : "running"

    const updatedEntry: SearchActivityTimelineEntry = {
      ...existing,
      callId: event.callId,
      toolName: event.toolName,
      query: searchQuery,
      status: nextStatus,
    }

    const updated = [...current]
    updated[existingIndex] = updatedEntry
    return updated
  }

  const existingIndex =
    event.callId !== null
      ? current.findIndex(
          (entry) =>
            entry.kind === "tool" &&
            entry.callId !== null &&
            entry.callId === event.callId
        )
      : current.findIndex(
          (entry) =>
            entry.kind === "tool" &&
            entry.callId === null &&
            entry.toolName === event.toolName &&
            entry.label === event.label
        )

  if (existingIndex === -1) {
    const nextEntry: ToolActivityTimelineEntry = {
      id: createClientMessageId(),
      kind: "tool",
      order: nextOrder(),
      createdAt: new Date().toISOString(),
      callId: event.callId,
      toolName: event.toolName,
      label: event.label,
      status: "running",
    }

    return [...current, nextEntry]
  }

  const existing = current[existingIndex]
  if (existing?.kind !== "tool") {
    return current
  }

  const nextStatus =
    existing.status === "success" || existing.status === "error"
      ? existing.status
      : "running"

  const updatedEntry: ToolActivityTimelineEntry = {
    ...existing,
    callId: event.callId,
    toolName: event.toolName,
    label: event.label,
    status: nextStatus,
  }

  const updated = [...current]
  updated[existingIndex] = updatedEntry
  return updated
}

export function applyToolResultToTimeline(
  current: ActivityTimelineEntry[],
  event: ToolResultEvent
): ActivityTimelineEntry[] {
  const targetIndex =
    event.callId !== null
      ? findLastIndexBy(
          current,
          (entry) =>
            (entry.kind === "tool" || entry.kind === "search") &&
            entry.callId !== null &&
            entry.callId === event.callId
        )
      : findLastIndexBy(
          current,
          (entry) =>
            (entry.kind === "tool" || entry.kind === "search") &&
            entry.status === "running"
        )

  if (targetIndex === -1) {
    return current
  }

  const target = current[targetIndex]
  if (
    !target ||
    (target.kind !== "tool" && target.kind !== "search") ||
    target.status === event.status
  ) {
    return current
  }

  const updated = [...current]
  updated[targetIndex] = { ...target, status: event.status }
  return updated
}

export function upsertSourcesTimelineFromSource(
  current: ActivityTimelineEntry[],
  source: MessageSource,
  nextOrder: () => number
): ActivityTimelineEntry[] {
  const lastEntry = current[current.length - 1]
  if (lastEntry?.kind === "sources") {
    const updatedLast: SourcesActivityTimelineEntry = {
      ...lastEntry,
      sources: upsertSource(lastEntry.sources, source),
    }

    return [...current.slice(0, -1), updatedLast]
  }

  const nextEntry: SourcesActivityTimelineEntry = {
    id: createClientMessageId(),
    kind: "sources",
    order: nextOrder(),
    createdAt: new Date().toISOString(),
    sources: [source],
  }

  return [...current, nextEntry]
}

export function upsertSource(
  current: MessageSource[],
  source: MessageSource
): MessageSource[] {
  const existingIndex = current.findIndex(
    (candidate) => candidate.url === source.url
  )

  if (existingIndex === -1) {
    return [...current, source]
  }

  const existing = current[existingIndex]
  if (!existing) {
    return current
  }

  const updated = [...current]
  updated[existingIndex] = {
    ...existing,
    title:
      existing.title === existing.url && source.title !== source.url
        ? source.title
        : existing.title,
  }
  return updated
}

export function appendReasoningToTimeline(
  current: ActivityTimelineEntry[],
  delta: string,
  nextOrder: () => number
): ActivityTimelineEntry[] {
  const startsMarkdownHeading = (text: string): boolean =>
    /^(\*\*[^*\n][^*\n]*\*\*|#{1,6}\s)/.test(text)

  const mergeReasoningText = (
    currentText: string,
    nextText: string
  ): string => {
    if (currentText.length === 0 || nextText.length === 0) {
      return `${currentText}${nextText}`
    }

    if (/\s$/.test(currentText) || /^\s/.test(nextText)) {
      return `${currentText}${nextText}`
    }

    if (startsMarkdownHeading(nextText)) {
      return `${currentText}\n\n${nextText}`
    }

    if (/[.!?]$/.test(currentText) && /^[A-Z][a-z]/.test(nextText)) {
      return `${currentText}\n\n${nextText}`
    }

    if (/[A-Za-z0-9)]$/.test(currentText) && /^[A-Za-z0-9(]/.test(nextText)) {
      return `${currentText} ${nextText}`
    }

    return `${currentText}${nextText}`
  }

  const normalizeReasoningText = (text: string): string =>
    text
      .replace(/\r\n/g, "\n")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/([.!?])(?=[A-Z][a-z])/g, "$1\n\n")
      .replace(/(\*\*[^*\n][^*\n]*\*\*)(?=[A-Z][a-z])/g, "$1\n\n")
      .replace(/\n{3,}/g, "\n\n")
      .trimEnd()

  if (delta.length === 0) {
    return current
  }

  const lastEntry = current[current.length - 1]
  if (lastEntry?.kind === "reasoning") {
    const mergedText = normalizeReasoningText(
      mergeReasoningText(lastEntry.text, delta)
    )
    if (mergedText.length === 0) {
      return current.slice(0, -1)
    }

    const updatedLast: ReasoningActivityTimelineEntry = {
      ...lastEntry,
      text: mergedText,
    }

    return [...current.slice(0, -1), updatedLast]
  }

  const initialText = normalizeReasoningText(delta)
  if (initialText.length === 0) {
    return current
  }

  const nextEntry: ReasoningActivityTimelineEntry = {
    id: createClientMessageId(),
    kind: "reasoning",
    order: nextOrder(),
    createdAt: new Date().toISOString(),
    text: initialText,
  }

  return [...current, nextEntry]
}

export function finalizeRunningTimelineToolEntries(
  current: ActivityTimelineEntry[],
  status: "success" | "error"
): ActivityTimelineEntry[] {
  if (
    !current.some(
      (entry) =>
        (entry.kind === "tool" || entry.kind === "search") &&
        entry.status === "running"
    )
  ) {
    return current
  }

  return current.map((entry) =>
    (entry.kind === "tool" || entry.kind === "search") &&
    entry.status === "running"
      ? { ...entry, status }
      : entry
  )
}

function findLastIndexBy<T>(
  current: T[],
  predicate: (entry: T) => boolean
): number {
  for (let index = current.length - 1; index >= 0; index -= 1) {
    const entry = current[index]
    if (entry && predicate(entry)) {
      return index
    }
  }

  return -1
}
