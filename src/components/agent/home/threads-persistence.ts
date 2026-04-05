"use client"

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useRef,
} from "react"
import { toast } from "sonner"

import { normalizeThread, type Thread } from "@/lib/shared/threads"

import {
  deleteThreadRequest,
  isAbortError,
  persistThreadRequest,
  THREAD_DELETE_ERROR_TOAST_ID,
  THREAD_SYNC_ERROR_TOAST_ID,
} from "./threads-api"
import {
  loadMigratedLocalThreads,
  mergeThreads,
  selectThreadsToPersist,
} from "./threads-storage"

const THREAD_SYNC_DEBOUNCE_MS = 800
const THREAD_SYNC_RETRY_MS = 3_000
const EMPTY_ASYNC_FLUSH = () => Promise.resolve()

export interface SaveThreadOptions {
  immediate?: boolean
}

export function useThreadPersistence(params: {
  currentThreadId: string | null
  setCurrentThreadIdState: Dispatch<SetStateAction<string | null>>
  setThreads: Dispatch<SetStateAction<Thread[]>>
  threads: Thread[]
}) {
  const pendingSyncsRef = useRef(new Map<string, Thread>())
  const pendingImmediatePersistIdsRef = useRef(new Set<string>())
  const flushTimeoutRef = useRef<number | null>(null)
  const flushQueuedThreadsRef = useRef<() => Promise<void>>(EMPTY_ASYNC_FLUSH)
  const inFlightControllersRef = useRef(new Map<string, AbortController>())

  const clearScheduledFlush = useCallback(() => {
    if (flushTimeoutRef.current !== null) {
      window.clearTimeout(flushTimeoutRef.current)
      flushTimeoutRef.current = null
    }
  }, [])

  const persistThread = useCallback(async (thread: Thread) => {
    const controller = new AbortController()
    inFlightControllersRef.current.set(thread.id, controller)

    try {
      return await persistThreadRequest(thread, controller.signal)
    } finally {
      const activeController = inFlightControllersRef.current.get(thread.id)

      if (activeController === controller) {
        inFlightControllersRef.current.delete(thread.id)
      }
    }
  }, [])

  const scheduleFlush = useCallback(
    (delayMs = THREAD_SYNC_DEBOUNCE_MS) => {
      clearScheduledFlush()

      flushTimeoutRef.current = window.setTimeout(() => {
        void flushQueuedThreadsRef.current()
      }, delayMs)
    },
    [clearScheduledFlush]
  )

  const handlePersistFailure = useCallback(
    (thread: Thread, error: unknown) => {
      if (isAbortError(error)) {
        return
      }

      console.error("Failed to sync thread:", error)
      pendingSyncsRef.current.set(thread.id, thread)
      toast.error(
        "Failed to sync conversation history. Recent changes may not appear on other devices yet.",
        {
          id: THREAD_SYNC_ERROR_TOAST_ID,
        }
      )
      scheduleFlush(THREAD_SYNC_RETRY_MS)
    },
    [scheduleFlush]
  )

  const persistThreadImmediately = useCallback(
    async (thread: Thread) => {
      try {
        const persistedThread = await persistThread(thread)

        params.setThreads((prev) => mergeThreads(prev, [persistedThread]))
        toast.dismiss(THREAD_SYNC_ERROR_TOAST_ID)
      } catch (error) {
        handlePersistFailure(thread, error)
      }
    },
    [handlePersistFailure, params, persistThread]
  )

  const updateThread = useCallback(
    (id: string, updater: (thread: Thread) => Thread) => {
      pendingImmediatePersistIdsRef.current.add(id)

      params.setThreads((prev) => {
        const existingThread = prev.find((thread) => thread.id === id)

        if (!existingThread) {
          pendingImmediatePersistIdsRef.current.delete(id)
          return prev
        }

        const nextThread = normalizeThread({
          ...updater(existingThread),
          updatedAt: new Date().toISOString(),
        })

        return mergeThreads(prev, [nextThread])
      })
    },
    [params]
  )

  const flushQueuedThreads = useCallback(async () => {
    clearScheduledFlush()

    const queuedThreads = Array.from(pendingSyncsRef.current.values())

    if (queuedThreads.length === 0) {
      return
    }

    pendingSyncsRef.current = new Map()

    const results = await Promise.allSettled(
      queuedThreads.map((thread) => persistThread(thread))
    )

    const failedThreads: Thread[] = []

    results.forEach((result, index) => {
      const thread = queuedThreads[index]

      if (!thread) {
        return
      }

      if (result.status === "fulfilled") {
        params.setThreads((prev) => mergeThreads(prev, [result.value]))
        return
      }

      if (!isAbortError(result.reason)) {
        console.error("Failed to sync thread:", result.reason)
        pendingSyncsRef.current.set(thread.id, thread)
        failedThreads.push(thread)
      }
    })

    if (failedThreads.length > 0) {
      toast.error(
        "Failed to sync conversation history. Recent changes may not appear on other devices yet.",
        {
          id: THREAD_SYNC_ERROR_TOAST_ID,
        }
      )
      scheduleFlush(THREAD_SYNC_RETRY_MS)
      return
    }

    toast.dismiss(THREAD_SYNC_ERROR_TOAST_ID)
  }, [clearScheduledFlush, params, persistThread, scheduleFlush])

  useEffect(() => {
    flushQueuedThreadsRef.current = flushQueuedThreads
  }, [flushQueuedThreads])

  useEffect(() => {
    const pendingImmediatePersistIds = pendingImmediatePersistIdsRef.current

    if (pendingImmediatePersistIds.size === 0) {
      return
    }

    const threadsToPersist = params.threads.filter((thread) =>
      pendingImmediatePersistIds.has(thread.id)
    )

    pendingImmediatePersistIds.clear()

    threadsToPersist.forEach((thread) => {
      pendingSyncsRef.current.delete(thread.id)
      void persistThreadImmediately(thread)
    })
  }, [params.threads, persistThreadImmediately])

  const saveThread = useCallback(
    (thread: Thread, options?: SaveThreadOptions) => {
      const normalizedThread = normalizeThread(thread)

      params.setThreads((prev) => mergeThreads(prev, [normalizedThread]))

      if (options?.immediate) {
        pendingSyncsRef.current.delete(normalizedThread.id)
        void persistThreadImmediately(normalizedThread)
        return
      }

      pendingSyncsRef.current.set(normalizedThread.id, normalizedThread)
      scheduleFlush()
    },
    [params, persistThreadImmediately, scheduleFlush]
  )

  const renameThread = useCallback(
    (id: string, title: string) => {
      updateThread(id, (thread) => ({
        ...thread,
        title,
      }))
    },
    [updateThread]
  )

  const toggleThreadPinned = useCallback(
    (id: string) => {
      updateThread(id, (thread) => ({
        ...thread,
        isPinned: !(thread.isPinned ?? false),
      }))
    },
    [updateThread]
  )

  const deleteThread = useCallback(
    (id: string) => {
      const deletedThread = params.threads.find((thread) => thread.id === id)
      const remainingThreads = params.threads.filter((thread) => thread.id !== id)

      pendingSyncsRef.current.delete(id)
      inFlightControllersRef.current.get(id)?.abort()
      inFlightControllersRef.current.delete(id)

      if (pendingSyncsRef.current.size === 0) {
        clearScheduledFlush()
      }

      params.setThreads(remainingThreads)

      if (params.currentThreadId === id) {
        params.setCurrentThreadIdState(null)
      }

      void (async () => {
        try {
          await deleteThreadRequest(id)
          toast.dismiss(THREAD_DELETE_ERROR_TOAST_ID)
        } catch (error) {
          if (isAbortError(error)) {
            return
          }

          console.error("Failed to delete thread:", error)

          if (deletedThread) {
            params.setThreads((prev) => mergeThreads(prev, [deletedThread]))
          }

          toast.error("Failed to delete conversation history.", {
            id: THREAD_DELETE_ERROR_TOAST_ID,
          })
        }
      })()
    },
    [clearScheduledFlush, params]
  )

  useEffect(() => {
    const localThreads = loadMigratedLocalThreads()

    if (localThreads.length === 0) {
      return
    }

    let threadsToPersist: Thread[] = []

    params.setThreads((prev) => {
      threadsToPersist = selectThreadsToPersist(localThreads, prev)
      return mergeThreads(prev, localThreads)
    })

    if (threadsToPersist.length === 0) {
      return
    }

    threadsToPersist.forEach((thread) => {
      pendingSyncsRef.current.set(thread.id, normalizeThread(thread))
    })

    scheduleFlush(0)
  }, [params, scheduleFlush])

  useEffect(() => {
    const controllers = inFlightControllersRef.current

    return () => {
      clearScheduledFlush()

      for (const controller of controllers.values()) {
        controller.abort()
      }

      controllers.clear()
    }
  }, [clearScheduledFlush])

  return {
    deleteThread,
    renameThread,
    saveThread,
    toggleThreadPinned,
  }
}
