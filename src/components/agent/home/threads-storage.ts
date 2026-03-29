"use client"

import {
  LEGACY_THREADS_STORAGE_KEY,
  LEGACY_THREADS_STORAGE_MIGRATION_KEY,
  normalizeThread,
  sortThreadsNewestFirst,
  type Thread,
  THREADS_STORAGE_KEY,
  THREADS_STORAGE_MIGRATION_KEY,
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

function parseStoredThreads(value: string | null): Thread[] {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter((candidate): candidate is Thread => {
        if (typeof candidate !== "object" || candidate === null) {
          return false
        }

        const thread = candidate as Partial<Thread>

        return (
          typeof thread.id === "string" &&
          typeof thread.title === "string" &&
          Array.isArray(thread.messages) &&
          typeof thread.createdAt === "string" &&
          typeof thread.updatedAt === "string"
        )
      })
      .map(normalizeThread)
  } catch {
    return []
  }
}

export function loadMigratedLocalThreads(): Thread[] {
  const legacyThreadStorageValue = localStorage.getItem(LEGACY_THREADS_STORAGE_KEY)

  if (
    legacyThreadStorageValue !== null &&
    localStorage.getItem(THREADS_STORAGE_KEY) === null
  ) {
    localStorage.setItem(THREADS_STORAGE_KEY, legacyThreadStorageValue)
  }

  const legacyMigrationValue = localStorage.getItem(
    LEGACY_THREADS_STORAGE_MIGRATION_KEY
  )

  if (
    legacyMigrationValue !== null &&
    localStorage.getItem(THREADS_STORAGE_MIGRATION_KEY) === null
  ) {
    localStorage.setItem(THREADS_STORAGE_MIGRATION_KEY, legacyMigrationValue)
  }

  const localThreads = parseStoredThreads(localStorage.getItem(THREADS_STORAGE_KEY))

  localStorage.removeItem(LEGACY_THREADS_STORAGE_KEY)
  localStorage.removeItem(THREADS_STORAGE_KEY)
  localStorage.removeItem(LEGACY_THREADS_STORAGE_MIGRATION_KEY)
  localStorage.setItem(THREADS_STORAGE_MIGRATION_KEY, "1")

  return localThreads
}

export function selectThreadsToPersist(
  localThreads: Thread[],
  serverThreads: Thread[]
): Thread[] {
  const serverThreadsById = new Map(serverThreads.map((thread) => [thread.id, thread]))

  return localThreads.filter((thread) => {
    const serverThread = serverThreadsById.get(thread.id)

    if (!serverThread) {
      return true
    }

    const localUpdatedAt = Date.parse(thread.updatedAt)
    const serverUpdatedAt = Date.parse(serverThread.updatedAt)

    return (
      Number.isFinite(localUpdatedAt) &&
      (!Number.isFinite(serverUpdatedAt) || localUpdatedAt > serverUpdatedAt)
    )
  })
}
