"use client"

import { Sparkles, X } from "lucide-react"
import { StickToBottom } from "use-stick-to-bottom"

import { ThreadsProvider } from "@/components/agent/home/threads-context"
import { useAgentSession } from "@/components/agent/home/use-agent-session"
import { Messages } from "@/components/agent/messages/messages"
import { PromptForm } from "@/components/agent/prompt-form/prompt-form"
import { ScrollToBottom } from "@/components/task/scroll-to-bottom"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

function MarketCopilotPanel({ onClose }: { onClose: () => void }) {
  const {
    state,
    queuedSubmission,
    streamingState,
    clearQueuedSubmission,
    handleStopStream,
    handlePromptSubmit,
    handleEditMessage,
  } = useAgentSession()

  const hasMessages = state.messages.length > 0

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0">
          <div className="font-departureMono text-sm tracking-tight">
            Copilot
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Ask market questions without leaving this screen.
          </p>
        </div>

        <Button
          aria-label="Close Copilot"
          className="shrink-0"
          onClick={onClose}
          size="iconSm"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <StickToBottom
          className="relative flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain"
          initial="smooth"
          resize="smooth"
        >
          <StickToBottom.Content className="relative flex min-h-full w-full flex-col px-4">
            <div className="relative z-0 flex w-full flex-1 flex-col pt-4">
              {hasMessages ? (
                <Messages
                  assistantMessageLayout="fullWidth"
                  disableEditing={state.isSubmitting || state.isStreaming}
                  isStreamPending={state.isSubmitting && !state.isStreaming}
                  messages={state.messages}
                  onEditMessage={handleEditMessage}
                  userMessageLayout="fullWidth"
                />
              ) : (
                <div className="flex flex-1 items-center">
                  <div className="w-full border border-border/70 bg-muted/20 p-4">
                    <div className="font-departureMono text-sm tracking-tight">
                      Research without context switching.
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Use Copilot for catalysts, earnings prep, quick symbol
                      comparisons, or follow-up questions on the market data in
                      front of you.
                    </p>
                  </div>
                </div>
              )}
            </div>

            <ScrollToBottom />

            <PromptForm
              isStreaming={streamingState}
              onClearQueuedMessage={clearQueuedSubmission}
              onStopStream={handleStopStream}
              onSubmit={handlePromptSubmit}
              queuedMessage={queuedSubmission?.message ?? null}
            />
          </StickToBottom.Content>
        </StickToBottom>
      </div>
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
      <Sparkles className="size-3.5" />
      <span>Copilot</span>
    </Button>
  )
}

export function MarketCopilotSidebar({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const isMobile = useIsMobile()

  return (
    <ThreadsProvider>
      {isMobile ? (
        <Sheet onOpenChange={onOpenChange} open={open}>
          <SheetContent className="!w-full p-0 sm:!max-w-[24rem]" side="right">
            <MarketCopilotPanel
              onClose={() => {
                onOpenChange(false)
              }}
            />
          </SheetContent>
        </Sheet>
      ) : open ? (
        <aside className="hidden h-full min-h-0 w-[24rem] shrink-0 overflow-hidden border-l border-border/70 md:flex md:flex-col">
          <MarketCopilotPanel
            onClose={() => {
              onOpenChange(false)
            }}
          />
        </aside>
      ) : null}
    </ThreadsProvider>
  )
}
