"use client"

import { MessageSquare, Pin, Search, X } from "lucide-react"
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

import type { Thread } from "@/lib/shared/threads"
import { cn } from "@/lib/utils"

import {
  getThreadSearchValue,
  groupThreadsForSearch,
  sortThreadsByRecency,
} from "./app-sidebar-utils"

export function ThreadSearchDialog({
  currentThreadId,
  emptyStateMessage = "No threads match your search.",
  onOpenChange,
  onSelectThread,
  open,
  threads,
}: {
  currentThreadId: string | null
  emptyStateMessage?: string
  onOpenChange: (open: boolean) => void
  onSelectThread: (threadId: string) => void
  open: boolean
  threads: Thread[]
}) {
  const [searchQuery, setSearchQuery] = useState("")
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)

  useEffect(() => {
    if (!open || !searchInputRef.current) {
      return
    }

    searchInputRef.current.focus()
    searchInputRef.current.select()
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onOpenChange, open])

  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase()
  const searchResults = sortThreadsByRecency(
    normalizedSearchQuery === ""
      ? threads
      : threads.filter((thread) =>
          getThreadSearchValue(thread).includes(normalizedSearchQuery)
        )
  )
  const searchGroups = groupThreadsForSearch(searchResults)

  if (!open || typeof document === "undefined") {
    return null
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-6 md:px-6 md:pt-20">
      <button
        type="button"
        aria-label="Close search"
        onClick={() => {
          onOpenChange(false)
        }}
        className="absolute inset-0 bg-black/35 supports-backdrop-filter:backdrop-blur-xs"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search chats"
        className="relative flex max-h-[min(74vh,680px)] w-full max-w-3xl flex-col overflow-hidden rounded-none border border-border bg-background shadow-lg"
      >
        <div className="flex items-center gap-3 border-b border-border py-3 pr-[11px] pl-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={searchInputRef}
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value)
            }}
            placeholder="Search chats..."
            className="h-8 w-full border-0 bg-transparent px-0 text-base text-foreground outline-none placeholder:text-muted-foreground/60 md:text-sm"
          />
          <button
            type="button"
            onClick={() => {
              onOpenChange(false)
            }}
            aria-label="Close search"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-none border border-transparent text-muted-foreground transition-colors hover:border-border hover:bg-accent/40 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="min-h-0 overflow-y-auto pb-4">
          {searchGroups.map((group) => (
            <div key={group.label}>
              <div className="flex h-10 items-center px-4 text-[10px] leading-none tracking-[0.18em] text-muted-foreground/70 uppercase">
                {group.label}
              </div>
              <div className="border-y border-border/60">
                {group.threads.map((thread) => (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      onSelectThread(thread.id)
                      onOpenChange(false)
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/40",
                      thread.id === currentThreadId && "bg-accent/45"
                    )}
                  >
                    <MessageSquare className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      {thread.title}
                    </span>
                    {thread.isPinned ? (
                      <Pin className="size-3.5 shrink-0 text-muted-foreground/75" />
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {searchResults.length === 0 ? (
            <div className="px-5 py-10 text-sm text-muted-foreground">
              {emptyStateMessage}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  )
}
