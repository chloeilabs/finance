"use client"

import { HatGlasses, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

import { HomePageContent } from "@/components/agent/home/home-content"
import { ThreadSearchDialog } from "@/components/agent/home/thread-search-dialog"
import { useThreads } from "@/components/agent/home/threads-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import type { AuthViewer } from "@/lib/shared/auth"
import type { ModelType } from "@/lib/shared/llm/models"
import { cn } from "@/lib/utils"

import { getCopilotOpenHref } from "./market-copilot-sidebar-utils"

const COPILOT_SUGGESTIONS = [
  "What is the bull case and bear case for Nvidia here?",
  "What has to go right for Tesla over the next two quarters?",
  "Does Apple's current valuation still fit the growth outlook?",
  "What would make you change the thesis on Microsoft here?",
] as const

function MarketCopilotPanel({
  initialSelectedModel,
  onNewChat,
  onClose,
  viewer,
}: {
  initialSelectedModel?: ModelType | null
  onNewChat: () => void
  onClose: () => void
  viewer: AuthViewer
}) {
  const router = useRouter()
  const { currentThreadId, setCurrentThreadId, threads } = useThreads()
  const [historyOpen, setHistoryOpen] = useState(false)

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5">
        <div className="min-w-0 select-none">
          <div className="font-departureMono text-sm tracking-tight text-foreground">
            Copilot
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            className="h-7 px-2 font-departureMono text-[10px] tracking-tight text-muted-foreground hover:text-foreground"
            onClick={() => {
              router.push(getCopilotOpenHref(currentThreadId))
            }}
            size="sm"
            variant="ghost"
          >
            Open
          </Button>

          <Button
            className="h-7 px-2 font-departureMono text-[10px] tracking-tight text-muted-foreground hover:text-foreground"
            onClick={() => {
              setHistoryOpen(false)
              onNewChat()
            }}
            size="sm"
            variant="ghost"
          >
            New Chat
          </Button>

          <Button
            className="h-7 px-2 font-departureMono text-[10px] tracking-tight text-muted-foreground hover:text-foreground"
            onClick={() => {
              setHistoryOpen(true)
            }}
            size="sm"
            variant="ghost"
          >
            History
          </Button>

          <Button
            aria-label="Close Copilot"
            className="-mr-1 shrink-0"
            onClick={onClose}
            size="iconSm"
            variant="ghost"
          >
            <X className="size-4" />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <HomePageContent
          assistantActivityLayout="fullWidth"
          assistantMessageLayout="fullWidth"
          contentWidthMode="rail"
          craftingShimmerLayout="default"
          homePromptSuggestions={COPILOT_SUGGESTIONS}
          initialSelectedModel={initialSelectedModel}
          integratedLayout
          userMessageLayout="fullWidth"
          viewer={viewer}
        />
      </div>

      <ThreadSearchDialog
        key={String(historyOpen)}
        currentThreadId={currentThreadId}
        onOpenChange={setHistoryOpen}
        onSelectThread={(threadId) => {
          setCurrentThreadId(threadId)
        }}
        open={historyOpen}
        threads={threads}
      />
    </div>
  )
}

export function MarketCopilotToggle({
  open,
  onToggle,
}: {
  open: boolean
  onToggle: () => void
}) {
  return (
    <Button
      aria-expanded={open}
      aria-haspopup="dialog"
      className={cn("px-2.5", open && "bg-muted text-foreground")}
      onClick={onToggle}
      size="sm"
      variant="ghost"
    >
      <HatGlasses className="size-3.5" />
      <span>Copilot</span>
    </Button>
  )
}

export function MarketCopilotSidebar({
  initialSelectedModel,
  open,
  onOpenChange,
  resetToken,
  viewer,
}: {
  initialSelectedModel?: ModelType | null
  open: boolean
  onOpenChange: (open: boolean) => void
  resetToken: number
  viewer: AuthViewer
}) {
  const isMobile = useIsMobile()
  const [localResetToken, setLocalResetToken] = useState(0)
  const { setCurrentThreadId } = useThreads()

  return isMobile ? (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent
        className="!w-full border-0 p-0 shadow-none data-[side=right]:border-l-0 sm:!max-w-[22rem]"
        side="right"
      >
        <MarketCopilotPanel
          key={resetToken + localResetToken}
          initialSelectedModel={initialSelectedModel}
          onNewChat={() => {
            setCurrentThreadId(null)
            setLocalResetToken((currentToken) => currentToken + 1)
          }}
          onClose={() => {
            onOpenChange(false)
          }}
          viewer={viewer}
        />
      </SheetContent>
    </Sheet>
  ) : open ? (
    <aside className="hidden h-full min-h-0 w-[22rem] shrink-0 overflow-hidden border-t border-l border-border/50 md:flex md:flex-col">
      <MarketCopilotPanel
        key={resetToken + localResetToken}
        initialSelectedModel={initialSelectedModel}
        onNewChat={() => {
          setCurrentThreadId(null)
          setLocalResetToken((currentToken) => currentToken + 1)
        }}
        onClose={() => {
          onOpenChange(false)
        }}
        viewer={viewer}
      />
    </aside>
  ) : null
}
