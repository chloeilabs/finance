"use client"

import {
  BarChart3,
  BriefcaseBusiness,
  ChevronDown,
  HatGlasses,
  Newspaper,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

import { ThreadSearchDialog } from "@/components/agent/home/thread-search-dialog"
import { useOptionalThreads } from "@/components/agent/home/threads-context"
import { LogoBurst } from "@/components/graphics/logo/logo-burst"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar"
import type { WatchlistRecord } from "@/lib/shared/markets/workspace"
import { cn } from "@/lib/utils"

const PRIMARY_NAV_ITEMS = [
  {
    href: "/",
    label: "Overview",
    icon: BarChart3,
  },
  {
    href: "/portfolio",
    label: "Portfolio",
    icon: BriefcaseBusiness,
  },
  {
    href: "/news",
    label: "News",
    icon: Newspaper,
  },
  {
    href: "/copilot",
    label: "Copilot",
    icon: HatGlasses,
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
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (!threadsContext) {
        return
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault()
        setOpenMobile(false)
        setIsSearchOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [setOpenMobile, threadsContext])

  const closeSearch = () => {
    setIsSearchOpen(false)
  }

  const navigateTo = (href: string) => {
    closeSearch()
    setOpenMobile(false)
    router.push(href)
  }

  const handleSelectThread = (threadId: string) => {
    closeSearch()
    threadsContext?.setCurrentThreadId(threadId)
    router.push(`/copilot?thread=${encodeURIComponent(threadId)}`)
    setOpenMobile(false)
  }

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader className="px-3 pt-3 pb-2 group-data-[collapsible=icon]:px-2 group-data-[collapsible=icon]:pt-2.5 group-data-[collapsible=icon]:pb-1">
          <div
            role="button"
            tabIndex={0}
            onClick={() => {
              navigateTo("/")
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                navigateTo("/")
              }
            }}
            className="flex h-8 w-full cursor-pointer items-center gap-3 overflow-hidden px-2 group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:translate-x-px group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:self-center group-data-[collapsible=icon]:px-0"
          >
            <LogoBurst className="shrink-0" size="md" />
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <p className="font-departureMono text-[18px] leading-none tracking-[0.08em] text-sidebar-foreground">
                Finance
              </p>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="translate-x-px pt-2 group-data-[collapsible=icon]:pt-3">
            <SidebarGroupContent className="space-y-3 group-data-[collapsible=icon]:space-y-0.5">
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
                    onNavigate={navigateTo}
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
                              navigateTo(`/watchlists/${watchlist.id}`)
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

            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarRail />
      </Sidebar>
      {threadsContext ? (
        <ThreadSearchDialog
          key={String(isSearchOpen)}
          currentThreadId={threadsContext.currentThreadId}
          onOpenChange={setIsSearchOpen}
          onSelectThread={handleSelectThread}
          open={isSearchOpen}
          threads={threadsContext.threads}
        />
      ) : null}
    </>
  )
}
