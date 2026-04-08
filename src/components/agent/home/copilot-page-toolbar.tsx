"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"

import { Button } from "@/components/ui/button"

import { ThreadSearchDialog } from "./thread-search-dialog"
import { useThreads } from "./threads-context"

function createComposeHref() {
  return `/copilot?compose=${encodeURIComponent(crypto.randomUUID())}`
}

export function CopilotPageToolbar() {
  const router = useRouter()
  const { currentThreadId, setCurrentThreadId, threads } = useThreads()
  const [historyOpen, setHistoryOpen] = useState(false)
  const activeThread = currentThreadId
    ? threads.find((thread) => thread.id === currentThreadId)
    : null
  const showNewChat = (activeThread?.messages.length ?? 0) > 0

  return (
    <>
      <div className="flex shrink-0 items-center gap-1">
        {showNewChat ? (
          <Button
            className="h-8 px-2.5 font-departureMono text-[10px] tracking-tight text-muted-foreground hover:text-foreground"
            onClick={() => {
              setHistoryOpen(false)
              setCurrentThreadId(null)
              router.push(createComposeHref())
            }}
            size="sm"
            variant="ghost"
          >
            New Chat
          </Button>
        ) : null}

        <Button
          className="h-8 px-2.5 font-departureMono text-[10px] tracking-tight text-muted-foreground hover:text-foreground"
          onClick={() => {
            setHistoryOpen(true)
          }}
          size="sm"
          variant="ghost"
        >
          History
        </Button>
      </div>

      <ThreadSearchDialog
        key={String(historyOpen)}
        currentThreadId={currentThreadId}
        onOpenChange={setHistoryOpen}
        onSelectThread={(threadId) => {
          setCurrentThreadId(threadId)
          router.push(`/copilot?thread=${encodeURIComponent(threadId)}`)
        }}
        open={historyOpen}
        threads={threads}
      />
    </>
  )
}
