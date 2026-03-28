"use client"

import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  Newspaper,
  Search,
  Sparkles,
  Star,
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

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
    href: "/copilot",
    label: "Copilot",
    icon: Sparkles,
  },
] as const

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
        onClick={() => {
          onNavigate(href)
        }}
      >
        <Icon className="size-4" />
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

  return (
    <Sidebar>
      <SidebarHeader className="gap-4 border-b border-sidebar-border/70 px-3 py-3">
        <Link
          className="group flex items-center gap-3 px-1 transition-opacity hover:opacity-85"
          href="/"
        >
          <LogoBurst className="size-8" />
          <div>
            <div className="font-departureMono text-sm tracking-tight">
              Yurie Markets
            </div>
            <div className="text-[11px] tracking-[0.18em] text-sidebar-foreground/60 uppercase">
              {planLabel} plan
            </div>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
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
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <div className="px-2 pt-1 pb-2 text-[11px] tracking-[0.2em] text-sidebar-foreground/60 uppercase">
            Watchlists
          </div>
          <SidebarGroupContent>
            <SidebarMenu>
              {watchlists.map((watchlist) => (
                <SidebarMenuItem key={watchlist.id}>
                  <SidebarMenuButton
                    isActive={pathname === `/watchlists/${watchlist.id}`}
                    onClick={() => {
                      router.push(`/watchlists/${watchlist.id}`)
                    }}
                  >
                    <span className="font-departureMono text-xs tracking-tight">
                      {watchlist.name}
                    </span>
                    <span
                      className={cn(
                        "ml-auto text-[11px] text-sidebar-foreground/60",
                        pathname === `/watchlists/${watchlist.id}` &&
                          "text-sidebar-foreground"
                      )}
                    >
                      {watchlist.symbols.length}
                    </span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}

              {watchlists.length === 0 ? (
                <div className="px-2 py-2 text-xs leading-5 text-sidebar-foreground/60">
                  Run `pnpm markets:migrate` to initialize market storage.
                </div>
              ) : null}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <div className="border-t border-sidebar-border/70 px-2 pt-3 text-xs leading-5 text-sidebar-foreground/60">
              US equities first, cached for the Basic plan, with premium modules
              ready to unlock later.
            </div>
            <div className="mt-2 flex items-center gap-2 px-2 pb-2 text-[11px] tracking-[0.16em] text-sidebar-foreground/60 uppercase">
              <ChevronRight className="size-3" />
              Stock research terminal
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
