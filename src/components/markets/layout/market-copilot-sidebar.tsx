"use client"

import { Sparkles, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { StickToBottom } from "use-stick-to-bottom"

import { ThreadsProvider } from "@/components/agent/home/threads-context"
import { useAgentSession } from "@/components/agent/home/use-agent-session"
import { Messages } from "@/components/agent/messages/messages"
import { PromptForm } from "@/components/agent/prompt-form/prompt-form"
import { ScrollToBottom } from "@/components/task/scroll-to-bottom"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent } from "@/components/ui/sheet"
import { useModels } from "@/hooks/agent/use-models"
import { usePersistentSelectedModel } from "@/hooks/agent/use-persistent-selected-model"
import { useIsMobile } from "@/hooks/use-mobile"
import { cn } from "@/lib/utils"

const COPILOT_SUGGESTIONS = [
  "What is the bull case and bear case for Nvidia here?",
  "What has to go right for Tesla over the next two quarters?",
  "Does Apple's current valuation still fit the growth outlook?",
  "What would make you change the thesis on Microsoft here?",
] as const

function MarketCopilotPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const {
    state,
    queuedSubmission,
    streamingState,
    resetConversation,
    clearQueuedSubmission,
    handleStopStream,
    handlePromptSubmit,
    handleEditMessage,
  } = useAgentSession()
  const { data: availableModels = [] } = useModels()
  const { selectedModel } = usePersistentSelectedModel(null, availableModels)

  const hasMessages = state.messages.length > 0

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-background">
      <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
        <div className="min-w-0 select-none">
          <div className="font-departureMono text-sm tracking-tight text-foreground">
            Copilot
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Button
            className="h-7 px-2 font-departureMono text-[10px] tracking-tight text-muted-foreground hover:text-foreground"
            onClick={() => {
              router.push("/history")
            }}
            size="sm"
            variant="ghost"
          >
            History
          </Button>

          <Button
            className="h-7 px-2 font-departureMono text-[10px] tracking-tight text-muted-foreground hover:text-foreground"
            onClick={resetConversation}
            size="sm"
            variant="ghost"
          >
            New Chat
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
        <StickToBottom
          className="relative flex h-full min-h-0 flex-col overflow-y-auto overscroll-contain"
          initial="smooth"
          resize="smooth"
        >
          <StickToBottom.Content className="relative flex min-h-full w-full flex-col items-center px-4">
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
                  <div className="w-full border border-border/70 bg-muted/20 p-3">
                    <div className="mb-3">
                      <div className="font-departureMono text-sm tracking-tight text-foreground">
                        Start with one of these.
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      {COPILOT_SUGGESTIONS.map((suggestion) => (
                        <Button
                          key={suggestion}
                          type="button"
                          variant="ghost"
                          disabled={!selectedModel}
                          className="h-auto w-full justify-start border border-border/70 px-3 py-2 text-left text-sm font-normal whitespace-normal text-foreground hover:bg-muted/70"
                          onClick={() => {
                            if (!selectedModel) {
                              return
                            }

                            handlePromptSubmit(
                              suggestion,
                              selectedModel,
                              streamingState
                            )
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
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
