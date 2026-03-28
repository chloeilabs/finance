"use client"

import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  GitCompareArrows,
  Newspaper,
  Search,
  Star,
} from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

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
} from "@/components/ui/sidebar"
import type { WatchlistRecord } from "@/lib/shared"
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

function WatchlistsLabel({
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
      <span>Watchlists</span>
      <ChevronDown
        className={cn(
          "size-3 text-sidebar-foreground/70 transition-transform duration-150",
          !isExpanded && "-rotate-90"
        )}
      />
    </button>
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
        className="h-auto min-h-0 cursor-pointer justify-start gap-3 rounded-none px-2.5 py-2 text-sm font-normal text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-active:bg-sidebar-accent/70 data-active:font-normal data-active:text-sidebar-foreground"
      >
        <Icon className="size-4 text-sidebar-foreground" />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

export function MarketSidebar({
  watchlists,
  planLabel,
}: {
  watchlists: WatchlistRecord[]
  planLabel: string
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isWatchlistsExpanded, setIsWatchlistsExpanded] = useState(true)

  return (
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
          <SidebarGroupContent className="space-y-4">
            <SidebarMenu className="gap-1">
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

            <div className="group-data-[collapsible=icon]:hidden">
              <div className="px-2 pt-1 text-[10px] tracking-[0.18em] text-sidebar-foreground/45 uppercase">
                {planLabel} plan
              </div>
              <WatchlistsLabel
                isExpanded={isWatchlistsExpanded}
                onToggle={() => {
                  setIsWatchlistsExpanded((current) => !current)
                }}
              />

              {isWatchlistsExpanded ? (
                watchlists.length > 0 ? (
                  <SidebarMenu className="gap-0.5">
                    {watchlists.map((watchlist) => (
                      <SidebarMenuItem key={watchlist.id}>
                        <SidebarMenuButton
                          isActive={pathname === `/watchlists/${watchlist.id}`}
                          onClick={() => {
                            router.push(`/watchlists/${watchlist.id}`)
                          }}
                          className="h-auto min-h-0 rounded-none px-2.5 py-2 text-sm font-normal text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-foreground data-active:bg-sidebar-accent/70 data-active:font-normal data-active:text-sidebar-foreground"
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
                  <div className="px-2.5 py-2 text-xs leading-5 text-sidebar-foreground/60">
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
  )
}
