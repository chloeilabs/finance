"use client"

import {
  normalizeThread,
  sortThreadsNewestFirst,
  type Thread,
} from "@/lib/shared/threads"

export function mergeThreads(
  existingThreads: Thread[],
  incomingThreads: Thread[]
): Thread[] {
  const merged = new Map<string, Thread>()

  const upsertThread = (thread: Thread) => {
    const normalizedThread = normalizeThread(thread)
    const existingThread = merged.get(normalizedThread.id)

    if (!existingThread) {
      merged.set(normalizedThread.id, normalizedThread)
      return
    }

    const existingUpdatedAt = Date.parse(existingThread.updatedAt)
    const incomingUpdatedAt = Date.parse(normalizedThread.updatedAt)

    if (
      Number.isFinite(incomingUpdatedAt) &&
      (!Number.isFinite(existingUpdatedAt) ||
        incomingUpdatedAt >= existingUpdatedAt)
    ) {
      merged.set(normalizedThread.id, normalizedThread)
    }
  }

  existingThreads.forEach(upsertThread)
  incomingThreads.forEach(upsertThread)

  return sortThreadsNewestFirst(Array.from(merged.values()))
}
