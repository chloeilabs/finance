"use client"

import { HatGlasses, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"

import { HomePageContent } from "@/components/agent/home/home-content"
import { ThreadSearchDialog } from "@/components/agent/home/thread-search-dialog"
import { useThreads } from "@/components/agent/home/threads-context"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import type { AuthViewer } from "@/lib/shared/auth"
import type { ModelType } from "@/lib/shared/llm/models"
import { cn } from "@/lib/utils"

import {
  clampMarketCopilotWidth,
  DEFAULT_MARKET_COPILOT_WIDTH_PX,
  getMarketCopilotMaxWidthPx,
  MARKET_COPILOT_RELEASE_SNAP_THRESHOLD_PX,
  MARKET_COPILOT_WIDTH_STEP_PX,
  MAX_MARKET_COPILOT_WIDTH_RATIO,
  resolveMarketCopilotWidthFromPointer,
  snapMarketCopilotWidth,
} from "./market-copilot-sidebar-resize"
import { getCopilotOpenHref } from "./market-copilot-sidebar-utils"

const COPILOT_SUGGESTIONS = [
  "What stands out in my portfolio right now?",
  "Where is my biggest concentration risk?",
  "Which positions are driving my income and total return?",
  "If I wanted to reduce risk, where would you start?",
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
  const activeThread = currentThreadId
    ? threads.find((thread) => thread.id === currentThreadId)
    : null
  const showNewChat = (activeThread?.messages.length ?? 0) > 0

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border/50 px-4 py-2.5">
        <div className="min-w-0 select-none">
          <div className="font-departureMono text-sm tracking-tight text-foreground">
            Copilot
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {showNewChat ? (
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
          ) : null}

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
  const [isResizing, setIsResizing] = useState(false)
  const [localResetToken, setLocalResetToken] = useState(0)
  const [desktopWidth, setDesktopWidth] = useState(
    DEFAULT_MARKET_COPILOT_WIDTH_PX
  )
  const asideRef = useRef<HTMLElement | null>(null)
  const resizeStateRef = useRef<{
    containerRight: number
    containerWidth: number
    pointerId: number
  } | null>(null)
  const { setCurrentThreadId } = useThreads()

  const getDesktopContainerWidth = useCallback(() => {
    if (typeof window === "undefined") {
      return DEFAULT_MARKET_COPILOT_WIDTH_PX
    }

    return (
      asideRef.current?.parentElement?.getBoundingClientRect().width ??
      window.innerWidth
    )
  }, [])

  const syncDesktopWidth = useCallback(() => {
    const containerWidth = getDesktopContainerWidth()

    setDesktopWidth((currentWidth) =>
      clampMarketCopilotWidth(currentWidth, containerWidth)
    )
  }, [getDesktopContainerWidth])

  const updateDesktopWidth = useCallback(
    (nextWidth: number) => {
      const containerWidth = getDesktopContainerWidth()

      setDesktopWidth(clampMarketCopilotWidth(nextWidth, containerWidth))
    },
    [getDesktopContainerWidth]
  )

  const clearResizeState = useCallback(() => {
    resizeStateRef.current = null
    document.body.style.removeProperty("cursor")
    document.body.style.removeProperty("user-select")
  }, [])

  const updateResizeWidthFromPointer = useCallback((pointerX: number) => {
    const resizeState = resizeStateRef.current

    if (!resizeState) {
      return
    }

    setDesktopWidth((currentWidth) => {
      const nextWidth = resolveMarketCopilotWidthFromPointer({
        containerRight: resizeState.containerRight,
        pointerX,
        containerWidth: resizeState.containerWidth,
      })

      return nextWidth === currentWidth ? currentWidth : nextWidth
    })
  }, [])

  const finishResize = useCallback(() => {
    const resizeState = resizeStateRef.current

    if (resizeState) {
      setDesktopWidth((currentWidth) =>
        snapMarketCopilotWidth(
          currentWidth,
          resizeState.containerWidth,
          MARKET_COPILOT_RELEASE_SNAP_THRESHOLD_PX
        )
      )
    }

    clearResizeState()
    setIsResizing(false)
  }, [clearResizeState])

  useEffect(() => {
    if (isMobile || !open) {
      return
    }

    const syncFrame = window.requestAnimationFrame(syncDesktopWidth)
    window.addEventListener("resize", syncDesktopWidth)

    return () => {
      window.cancelAnimationFrame(syncFrame)
      window.removeEventListener("resize", syncDesktopWidth)
    }
  }, [isMobile, open, syncDesktopWidth])

  useEffect(() => clearResizeState, [clearResizeState])

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
    <aside
      ref={asideRef}
      aria-label="Copilot sidebar"
      className={cn(
        "relative hidden h-full min-h-0 shrink-0 overflow-hidden border-t border-l border-border/50 md:flex md:flex-col",
        isResizing
          ? "duration-0"
          : "transition-[width] duration-150 ease-[cubic-bezier(0.2,0.9,0.2,1)]"
      )}
      style={{
        maxWidth: `${String(MAX_MARKET_COPILOT_WIDTH_RATIO * 100)}%`,
        minWidth: `${String(DEFAULT_MARKET_COPILOT_WIDTH_PX)}px`,
        willChange: isResizing ? "width" : undefined,
        width: `${String(desktopWidth)}px`,
      }}
    >
      <button
        aria-controls="market-copilot-sidebar-panel"
        aria-label="Resize Copilot sidebar"
        className="group/copilot-resize absolute inset-y-0 left-0 z-10 w-3 -translate-x-1/2 cursor-col-resize touch-none outline-none"
        onDoubleClick={() => {
          updateDesktopWidth(DEFAULT_MARKET_COPILOT_WIDTH_PX)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault()
            updateDesktopWidth(desktopWidth + MARKET_COPILOT_WIDTH_STEP_PX)
            return
          }

          if (event.key === "ArrowRight") {
            event.preventDefault()
            updateDesktopWidth(desktopWidth - MARKET_COPILOT_WIDTH_STEP_PX)
            return
          }

          if (event.key === "Home") {
            event.preventDefault()
            updateDesktopWidth(DEFAULT_MARKET_COPILOT_WIDTH_PX)
            return
          }

          if (event.key === "End") {
            event.preventDefault()
            updateDesktopWidth(
              getMarketCopilotMaxWidthPx(getDesktopContainerWidth())
            )
          }
        }}
        onPointerCancel={finishResize}
        onPointerDown={(event) => {
          const containerRect =
            asideRef.current?.parentElement?.getBoundingClientRect()

          if (!containerRect) {
            return
          }

          event.preventDefault()
          setIsResizing(true)
          resizeStateRef.current = {
            containerRight: containerRect.right,
            containerWidth: containerRect.width,
            pointerId: event.pointerId,
          }
          document.body.style.setProperty("cursor", "col-resize")
          document.body.style.setProperty("user-select", "none")
          event.currentTarget.setPointerCapture(event.pointerId)
          updateResizeWidthFromPointer(event.clientX)
        }}
        onPointerMove={(event) => {
          if (resizeStateRef.current?.pointerId !== event.pointerId) {
            return
          }

          updateResizeWidthFromPointer(event.clientX)
        }}
        onPointerUp={(event) => {
          if (resizeStateRef.current?.pointerId !== event.pointerId) {
            return
          }

          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId)
          }

          finishResize()
        }}
        title="Resize Copilot sidebar"
        type="button"
      >
        <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-border/60 transition-colors group-hover/copilot-resize:bg-foreground/20 group-focus-visible/copilot-resize:bg-foreground/35" />
      </button>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 w-px bg-border/60"
      />
      <div id="market-copilot-sidebar-panel" className="min-h-0 flex-1">
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
      </div>
    </aside>
  ) : null
}
