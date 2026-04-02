"use client"

import {
  ChevronDown,
  type LucideIcon,
  MoreHorizontal,
  Pencil,
  Pin,
  Search,
  Trash2,
} from "lucide-react"
import { type KeyboardEvent, useEffect, useRef, useState } from "react"

import { LogoBurst } from "@/components/graphics/logo/logo-burst"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import { type Thread,THREAD_TITLE_MAX_LENGTH } from "@/lib/shared/threads"
import { cn } from "@/lib/utils"

import { ThreadSearchDialog } from "./thread-search-dialog"
import { useThreads } from "./threads-context"

function ChatsLabel({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      className="flex w-full cursor-pointer items-center gap-1.5 px-2 pt-1 pb-1 text-left text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground focus-visible:outline-none"
    >
      <span>Your chats</span>
      <ChevronDown
        className={cn(
          "size-3 text-sidebar-foreground/70 transition-transform duration-150",
          !isExpanded && "-rotate-90"
        )}
      />
    </button>
  )
}

function ThreadMenuItem({
  icon: Icon,
  children,
  onClick,
  destructive = false,
}: {
  icon: LucideIcon
  children: string
  onClick: () => void
  destructive?: boolean
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      variant={destructive ? "destructive" : "default"}
      className="cursor-pointer"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span>{children}</span>
    </DropdownMenuItem>
  )
}

export function AppSidebar({ onGoHome }: { onGoHome?: () => void }) {
  const {
    threads,
    currentThreadId,
    setCurrentThreadId,
    renameThread,
    toggleThreadPinned,
    deleteThread,
  } = useThreads()
  const { setOpenMobile } = useSidebar()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isChatsExpanded, setIsChatsExpanded] = useState(true)
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")
  const renameInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!editingThreadId || !renameInputRef.current) {
      return
    }

    renameInputRef.current.focus()
    renameInputRef.current.select()
  }, [editingThreadId])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setEditingThreadId(null)
        setRenameDraft("")
        setOpenMobile(false)
        setIsSearchOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [setOpenMobile])

  const stopRenaming = () => {
    setEditingThreadId(null)
    setRenameDraft("")
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
  }

  const openSearch = () => {
    stopRenaming()
    setOpenMobile(false)
    setIsSearchOpen(true)
  }

  const submitRename = () => {
    if (!editingThreadId) {
      return
    }

    const thread = threads.find((candidate) => candidate.id === editingThreadId)

    if (!thread) {
      stopRenaming()
      return
    }

    if (renameDraft.trim() !== thread.title.trim()) {
      renameThread(editingThreadId, renameDraft)
    }

    stopRenaming()
  }

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      submitRename()
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      stopRenaming()
    }
  }

  const handleSelectThread = (threadId: string) => {
    closeSearch()
    setCurrentThreadId(threadId)
    setOpenMobile(false)
  }

  const handleGoHome = () => {
    closeSearch()
    stopRenaming()

    if (onGoHome) {
      onGoHome()
    } else {
      setCurrentThreadId(null)
    }

    setOpenMobile(false)
  }

  const renderThreadList = (items: Thread[]) => {
    return (
      <SidebarMenu className="gap-0.5">
        {items.map((thread) => {
          const isEditing = editingThreadId === thread.id

          return (
            <SidebarMenuItem key={thread.id}>
              {isEditing ? (
                <div className="border border-sidebar-border bg-background p-1">
                  <SidebarInput
                    ref={renameInputRef}
                    value={renameDraft}
                    maxLength={THREAD_TITLE_MAX_LENGTH}
                    onChange={(event) => {
                      setRenameDraft(event.target.value)
                    }}
                    onBlur={submitRename}
                    onKeyDown={handleRenameKeyDown}
                    placeholder="Rename thread"
                    className="h-8 border-0 bg-transparent px-2 py-1 text-xs shadow-none focus-visible:ring-1"
                  />
                </div>
              ) : (
                <>
                  <SidebarMenuButton
                    isActive={thread.id === currentThreadId}
                    onClick={() => {
                      handleSelectThread(thread.id)
                    }}
                    className="h-auto min-h-0 rounded-none px-2.5 py-2 text-sm font-normal text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-active:bg-sidebar-accent/70 data-active:font-normal data-active:text-sidebar-foreground"
                  >
                    {thread.isPinned ? (
                      <Pin className="size-3.5 shrink-0 text-sidebar-foreground" />
                    ) : null}
                    <span className="truncate">{thread.title}</span>
                  </SidebarMenuButton>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuAction showOnHover className="cursor-pointer">
                        <MoreHorizontal />
                        <span className="sr-only">More</span>
                      </SidebarMenuAction>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-52"
                      side="bottom"
                      align="end"
                    >
                      <ThreadMenuItem
                        icon={Pencil}
                        onClick={() => {
                          setEditingThreadId(thread.id)
                          setRenameDraft(thread.title)
                        }}
                      >
                        Rename thread
                      </ThreadMenuItem>
                      <ThreadMenuItem
                        icon={Pin}
                        onClick={() => {
                          toggleThreadPinned(thread.id)
                        }}
                      >
                        {thread.isPinned ? "Unpin thread" : "Pin thread"}
                      </ThreadMenuItem>
                      <DropdownMenuSeparator />
                      <ThreadMenuItem
                        icon={Trash2}
                        onClick={() => {
                          deleteThread(thread.id)
                        }}
                        destructive
                      >
                        Delete thread
                      </ThreadMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </SidebarMenuItem>
          )
        })}
      </SidebarMenu>
    )
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border/70 p-3">
          <div
            role="button"
            tabIndex={0}
            onClick={handleGoHome}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                handleGoHome()
              }
            }}
            className="flex h-7 w-full cursor-pointer items-center gap-3 overflow-hidden px-2 group-data-[collapsible=icon]:translate-x-px group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:self-center group-data-[collapsible=icon]:px-0"
          >
            <LogoBurst className="shrink-0" size="md" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="font-departureMono text-[18px] leading-none tracking-[0.08em] text-sidebar-foreground">
                Yurie
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          {threads.length > 0 && (
            <SidebarGroup className="translate-x-px">
              <SidebarGroupContent className="space-y-4">
                <SidebarMenu className="gap-1">
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Search chats"
                      onClick={openSearch}
                      className="h-auto min-h-0 cursor-pointer justify-start gap-3 rounded-none px-2.5 py-2 text-sm font-normal text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    >
                      <Search className="size-4 text-sidebar-foreground" />
                      <span>Search chats</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>

                <div className="group-data-[collapsible=icon]:hidden">
                  <ChatsLabel
                    isExpanded={isChatsExpanded}
                    onToggle={() => {
                      setIsChatsExpanded((current) => !current)
                    }}
                  />
                  {isChatsExpanded ? renderThreadList(threads) : null}
                </div>
              </SidebarGroupContent>
            </SidebarGroup>
          )}
        </SidebarContent>

        <SidebarRail />
      </Sidebar>

      <ThreadSearchDialog
        key={String(isSearchOpen)}
        currentThreadId={currentThreadId}
        onOpenChange={setIsSearchOpen}
        onSelectThread={handleSelectThread}
        open={isSearchOpen}
        threads={threads}
      />
    </>
  )
}
