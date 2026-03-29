"use client"

import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  GitCompareArrows,
  Globe,
  HatGlasses,
  MessageSquare,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Pin,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import {
  type KeyboardEvent,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react"
import { createPortal } from "react-dom"

import {
  getThreadSearchValue,
  groupThreadsForSearch,
  sortThreadsByRecency,
} from "@/components/agent/home/app-sidebar-utils"
import { useOptionalThreads } from "@/components/agent/home/threads-context"
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
import type { WatchlistRecord } from "@/lib/shared/markets/workspace"
import { type Thread, THREAD_TITLE_MAX_LENGTH } from "@/lib/shared/threads"
import { cn } from "@/lib/utils"

const PRIMARY_NAV_ITEMS = [
  {
    href: "/",
    label: "Overview",
    icon: BarChart3,
  },
  {
    href: "/markets",
    label: "Markets",
    icon: Star,
  },
  {
    href: "/assets",
    label: "Assets",
    icon: Globe,
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: CalendarDays,
  },
  {
    href: "/news",
    label: "News",
    icon: Newspaper,
  },
  {
    href: "/screeners",
    label: "Screeners",
    icon: Search,
  },
  {
    href: "/compare",
    label: "Compare",
    icon: GitCompareArrows,
  },
] as const

const SIDEBAR_COLLAPSIBLE_LABEL_CLASS =
  "flex w-full cursor-pointer items-center gap-1.5 px-2 py-1 text-left text-sm text-sidebar-foreground/70 transition-colors hover:text-sidebar-foreground focus-visible:outline-none"
const SIDEBAR_MENU_BUTTON_CLASS =
  "h-auto min-h-0 cursor-pointer justify-start gap-3 rounded-none px-2.5 py-2 text-sm font-normal text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-active:bg-sidebar-accent/70 data-active:font-normal data-active:text-sidebar-foreground"
const SIDEBAR_MENU_LIST_CLASS = "gap-0.5"
const SIDEBAR_EMPTY_STATE_CLASS =
  "px-2.5 py-2 text-xs leading-5 text-sidebar-foreground/60"

function SectionToggleLabel({
  label,
  isExpanded,
  onToggle,
}: {
  label: string
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      className={SIDEBAR_COLLAPSIBLE_LABEL_CLASS}
    >
      <span>{label}</span>
      <ChevronDown
        className={cn(
          "size-3 text-sidebar-foreground/70 transition-transform duration-150",
          !isExpanded && "-rotate-90"
        )}
      />
    </button>
  )
}

function WatchlistsLabel({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <SectionToggleLabel
      label="Watchlists"
      isExpanded={isExpanded}
      onToggle={onToggle}
    />
  )
}

function ChatsLabel({
  isExpanded,
  onToggle,
}: {
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <SectionToggleLabel
      label="Your chats"
      isExpanded={isExpanded}
      onToggle={onToggle}
    />
  )
}

function SidebarLink({
  href,
  label,
  icon: Icon,
  isActive,
  onNavigate,
}: {
  href: string
  label: string
  icon: (typeof PRIMARY_NAV_ITEMS)[number]["icon"]
  isActive: boolean
  onNavigate: (href: string) => void
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        tooltip={label}
        onClick={() => {
          onNavigate(href)
        }}
        className={SIDEBAR_MENU_BUTTON_CLASS}
      >
        <Icon className="size-4 text-sidebar-foreground" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function ThreadMenuItem({
  icon: Icon,
  children,
  onClick,
  destructive = false,
}: {
  icon: typeof MoreHorizontal
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

export function MarketSidebar({
  watchlists,
}: {
  watchlists: WatchlistRecord[]
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { setOpenMobile } = useSidebar()
  const threadsContext = useOptionalThreads()
  const [isWatchlistsExpanded, setIsWatchlistsExpanded] = useState(true)
  const [isChatsExpanded, setIsChatsExpanded] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [editingThreadId, setEditingThreadId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const deferredSearchQuery = useDeferredValue(searchQuery)
  const visibleThreads = threadsContext
    ? sortThreadsByRecency(threadsContext.threads)
    : []
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase()
  const searchResults =
    threadsContext && normalizedSearchQuery !== ""
      ? sortThreadsByRecency(
          threadsContext.threads.filter((thread) =>
            getThreadSearchValue(thread).includes(normalizedSearchQuery)
          )
        )
      : visibleThreads
  const searchGroups = groupThreadsForSearch(searchResults)

  useEffect(() => {
    if (!editingThreadId || !renameInputRef.current) {
      return
    }

    renameInputRef.current.focus()
    renameInputRef.current.select()
  }, [editingThreadId])

  useEffect(() => {
    if (!isSearchOpen || !searchInputRef.current) {
      return
    }

    searchInputRef.current.focus()
    searchInputRef.current.select()
  }, [isSearchOpen])

  useEffect(() => {
    if (!isSearchOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isSearchOpen])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!threadsContext) {
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setEditingThreadId(null)
        setRenameDraft("")
        setSearchQuery("")
        setOpenMobile(false)
        setIsSearchOpen(true)
        return
      }

      if (event.key === "Escape") {
        setIsSearchOpen(false)
        setSearchQuery("")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [setOpenMobile, threadsContext])

  const stopRenaming = () => {
    setEditingThreadId(null)
    setRenameDraft("")
  }

  const closeSearch = () => {
    setIsSearchOpen(false)
    setSearchQuery("")
  }

  const openSearch = () => {
    stopRenaming()
    setOpenMobile(false)
    setSearchQuery("")
    setIsSearchOpen(true)
  }

  const handleOpenCopilot = () => {
    stopRenaming()
    closeSearch()
    router.push("/copilot")
    setOpenMobile(false)
  }

  const handleSelectThread = (threadId: string) => {
    closeSearch()
    threadsContext?.setCurrentThreadId(threadId)
    router.push(`/copilot?thread=${encodeURIComponent(threadId)}`)
    setOpenMobile(false)
  }

  const submitRename = () => {
    if (!threadsContext || !editingThreadId) {
      return
    }

    const thread = threadsContext.threads.find(
      (candidate) => candidate.id === editingThreadId
    )

    if (!thread) {
      stopRenaming()
      return
    }

    if (renameDraft.trim() !== thread.title.trim()) {
      threadsContext.renameThread(editingThreadId, renameDraft)
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

  const renderThreadList = (items: Thread[]) => {
    if (!threadsContext) {
      return null
    }

    return (
      <SidebarMenu className={SIDEBAR_MENU_LIST_CLASS}>
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
                    isActive={
                      pathname === "/copilot" &&
                      threadsContext.currentThreadId === thread.id
                    }
                    onClick={() => {
                      handleSelectThread(thread.id)
                    }}
                    className={SIDEBAR_MENU_BUTTON_CLASS}
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
                          threadsContext.toggleThreadPinned(thread.id)
                        }}
                      >
                        {thread.isPinned ? "Unpin thread" : "Pin thread"}
                      </ThreadMenuItem>
                      <DropdownMenuSeparator />
                      <ThreadMenuItem
                        icon={Trash2}
                        onClick={() => {
                          threadsContext.deleteThread(thread.id)
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

  const searchOverlay =
    threadsContext && isSearchOpen && typeof document !== "undefined"
      ? createPortal(
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-16 pb-6 md:px-6 md:pt-20">
            <button
              type="button"
              aria-label="Close search"
              onClick={closeSearch}
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
                  onClick={closeSearch}
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
                            handleSelectThread(thread.id)
                          }}
                          className={cn(
                            "flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-accent/40",
                            thread.id === threadsContext.currentThreadId &&
                              "bg-accent/45"
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
                    No threads match your search.
                  </div>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-sidebar-border/70 p-3">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              router.push("/")
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                router.push("/")
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
          <SidebarGroup className="translate-x-px">
            <SidebarGroupContent className="space-y-3">
              <SidebarMenu className={SIDEBAR_MENU_LIST_CLASS}>
                {PRIMARY_NAV_ITEMS.map((item) => (
                  <SidebarLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    isActive={
                      item.href === "/"
                        ? pathname === "/"
                        : pathname === item.href ||
                          pathname.startsWith(`${item.href}/`)
                    }
                    onNavigate={(href) => {
                      router.push(href)
                    }}
                  />
                ))}
              </SidebarMenu>

              <div className="space-y-1.5 group-data-[collapsible=icon]:hidden">
                <WatchlistsLabel
                  isExpanded={isWatchlistsExpanded}
                  onToggle={() => {
                    setIsWatchlistsExpanded((current) => !current)
                  }}
                />

                {isWatchlistsExpanded ? (
                  watchlists.length > 0 ? (
                    <SidebarMenu className={SIDEBAR_MENU_LIST_CLASS}>
                      {watchlists.map((watchlist) => (
                        <SidebarMenuItem key={watchlist.id}>
                          <SidebarMenuButton
                            isActive={
                              pathname === `/watchlists/${watchlist.id}`
                            }
                            onClick={() => {
                              router.push(`/watchlists/${watchlist.id}`)
                            }}
                            className={SIDEBAR_MENU_BUTTON_CLASS}
                          >
                            <div className="min-w-0 flex-1">
                              <span className="block truncate font-departureMono text-xs tracking-tight">
                                {watchlist.name}
                              </span>
                            </div>
                            <span
                              className={cn(
                                "shrink-0 text-[11px] text-sidebar-foreground/60",
                                pathname === `/watchlists/${watchlist.id}` &&
                                  "text-sidebar-foreground"
                              )}
                            >
                              {watchlist.symbols.length}
                            </span>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  ) : (
                    <div className={SIDEBAR_EMPTY_STATE_CLASS}>
                      Run `pnpm markets:migrate` to initialize market storage.
                    </div>
                  )
                ) : null}
              </div>

              <div className="space-y-1.5">
                <SidebarMenu className={SIDEBAR_MENU_LIST_CLASS}>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      isActive={pathname === "/copilot"}
                      tooltip="Open Copilot"
                      onClick={() => {
                        handleOpenCopilot()
                      }}
                      className={SIDEBAR_MENU_BUTTON_CLASS}
                    >
                      <HatGlasses className="size-4 text-sidebar-foreground" />
                      <span>Copilot</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Search chats"
                      onClick={() => {
                        if (threadsContext) {
                          openSearch()
                          return
                        }

                        handleOpenCopilot()
                      }}
                      className={SIDEBAR_MENU_BUTTON_CLASS}
                    >
                      <Search className="size-4 text-sidebar-foreground" />
                      <span>Search chats</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>

                {threadsContext ? (
                  <div className="space-y-1.5 pt-0.5 group-data-[collapsible=icon]:hidden">
                    <ChatsLabel
                      isExpanded={isChatsExpanded}
                      onToggle={() => {
                        setIsChatsExpanded((current) => !current)
                      }}
                    />

                    {isChatsExpanded ? (
                      visibleThreads.length > 0 ? (
                        renderThreadList(visibleThreads)
                      ) : (
                        <div className={SIDEBAR_EMPTY_STATE_CLASS}>
                          Start a Copilot conversation to see your chats here.
                        </div>
                      )
                    ) : null}
                  </div>
                ) : null}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarRail />
      </Sidebar>
      {searchOverlay}
    </>
  )
}
