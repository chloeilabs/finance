"use client"

import { useCallback, useState } from "react"

import { AppLauncher } from "@/components/agent/home/app-launcher"
import { UserMenu } from "@/components/auth/user-menu"
import {
  MarketCopilotSidebar,
  MarketCopilotToggle,
} from "@/components/markets/layout/market-copilot-sidebar"
import { SymbolSearch } from "@/components/markets/search/symbol-search"
import { WarningStrip } from "@/components/markets/ui/market-primitives"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  MARKET_COPILOT_COOKIE_NAME,
  UI_STATE_COOKIE_MAX_AGE,
} from "@/lib/constants"
import type { AuthViewer, WatchlistRecord } from "@/lib/shared"

import { MarketSidebar } from "./market-sidebar"

export function MarketShell({
  children,
  initialCopilotOpen = false,
  initialSidebarOpen = true,
  viewer,
  watchlists,
  planLabel,
  warnings,
}: {
  children: React.ReactNode
  initialCopilotOpen?: boolean
  initialSidebarOpen?: boolean
  viewer: AuthViewer
  watchlists: WatchlistRecord[]
  planLabel: string
  warnings: string[]
}) {
  const [copilotOpen, setCopilotOpenState] = useState(initialCopilotOpen)
  const setCopilotOpen = useCallback(
    (value: boolean | ((currentOpen: boolean) => boolean)) => {
      setCopilotOpenState((currentOpen) => {
        const nextOpen =
          typeof value === "function" ? value(currentOpen) : value

        document.cookie = `${MARKET_COPILOT_COOKIE_NAME}=${String(nextOpen)}; path=/; max-age=${String(UI_STATE_COOKIE_MAX_AGE)}`

        return nextOpen
      })
    },
    []
  )

  return (
    <SidebarProvider defaultOpen={initialSidebarOpen}>
      <MarketSidebar planLabel={planLabel} watchlists={watchlists} />
      <SidebarInset className="h-svh min-h-0 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-border/70 bg-background">
            <div className="z-10 flex h-[52px] shrink-0 items-center gap-3 px-3">
              <SidebarTrigger />

              <SymbolSearch
                className="max-w-none min-w-0 flex-1 md:max-w-md"
                inputClassName="h-9"
              />

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                <MarketCopilotToggle
                  onToggle={() => {
                    setCopilotOpen((currentOpen) => !currentOpen)
                  }}
                  open={copilotOpen}
                />
                <AppLauncher className="size-7" />
                <UserMenu viewer={viewer} className="size-7" />
              </div>
            </div>
            <WarningStrip warnings={warnings} />
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div
              className="market-workspace min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
              data-copilot-open={copilotOpen ? "true" : "false"}
            >
              {children}
            </div>
            <MarketCopilotSidebar
              onOpenChange={(open) => {
                setCopilotOpen(open)
              }}
              open={copilotOpen}
            />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
