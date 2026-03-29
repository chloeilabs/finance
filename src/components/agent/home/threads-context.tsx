"use client"

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react"

import { normalizeThread, sortThreadsNewestFirst, type Thread } from "@/lib/shared/threads"

import {
  type SaveThreadOptions,
  useThreadPersistence,
} from "./threads-persistence"

interface ThreadsContextValue {
  threads: Thread[]
  currentThreadId: string | null
  setCurrentThreadId: (id: string | null) => void
  saveThread: (thread: Thread, options?: SaveThreadOptions) => void
  renameThread: (id: string, title: string) => void
  toggleThreadPinned: (id: string) => void
  deleteThread: (id: string) => void
}

const ThreadsContext = createContext<ThreadsContextValue | undefined>(undefined)

export function ThreadsProvider({
  children,
  initialThreads = [],
}: {
  children: ReactNode
  initialThreads?: Thread[]
}) {
  const [threads, setThreads] = useState<Thread[]>(() =>
    sortThreadsNewestFirst(initialThreads.map(normalizeThread))
  )
  const [currentThreadId, setCurrentThreadIdState] = useState<string | null>(
    null
  )

  const setCurrentThreadId = useCallback((id: string | null) => {
    setCurrentThreadIdState(id)
  }, [])

  const { deleteThread, renameThread, saveThread, toggleThreadPinned } =
    useThreadPersistence({
      currentThreadId,
      setCurrentThreadIdState,
      setThreads,
      threads,
    })

  return (
    <ThreadsContext.Provider
      value={{
        threads,
        currentThreadId,
        setCurrentThreadId,
        saveThread,
        renameThread,
        toggleThreadPinned,
        deleteThread,
      }}
    >
      {children}
    </ThreadsContext.Provider>
  )
}

export function useThreads() {
  const context = useContext(ThreadsContext)

  if (!context) {
    throw new Error("useThreads must be used within a ThreadsProvider")
  }

  return context
}

export function useOptionalThreads() {
  return useContext(ThreadsContext)
}
