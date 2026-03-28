"use client"

import { AppLauncher } from "@/components/agent/home/app-launcher"
import { UserMenu } from "@/components/auth/user-menu"
import { SymbolSearch } from "@/components/markets/search/symbol-search"
import { WarningStrip } from "@/components/markets/ui/market-primitives"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import type { AuthViewer, WatchlistRecord } from "@/lib/shared"

import { MarketSidebar } from "./market-sidebar"

export function MarketShell({
  children,
  viewer,
  watchlists,
  planLabel,
  warnings,
}: {
  children: React.ReactNode
  viewer: AuthViewer
  watchlists: WatchlistRecord[]
  planLabel: string
  warnings: string[]
}) {
  return (
    <SidebarProvider defaultOpen>
      <MarketSidebar planLabel={planLabel} watchlists={watchlists} />
      <SidebarInset className="min-h-0 overflow-hidden">
        <div className="flex h-full flex-col">
          <div className="border-b border-border/70 bg-background">
            <div className="flex flex-col gap-3 px-3 py-3 sm:px-4 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
              <div className="flex items-center">
                <SidebarTrigger />
              </div>

              <SymbolSearch className="order-last w-full lg:order-none" />

              <div className="flex items-center justify-end gap-1.5">
                <AppLauncher className="size-7" />
                <UserMenu viewer={viewer} className="size-7" />
              </div>
            </div>
            <WarningStrip warnings={warnings} />
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
