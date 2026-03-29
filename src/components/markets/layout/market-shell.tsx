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
import type { AuthViewer } from "@/lib/shared/auth"
import type { ModelType } from "@/lib/shared/llm/models"
import type { WatchlistRecord } from "@/lib/shared/markets/workspace"
import { cn } from "@/lib/utils"

import { MarketSidebar } from "./market-sidebar"

export function MarketShell({
  children,
  enableCopilotRail = true,
  initialCopilotOpen = false,
  initialSelectedModel,
  initialSidebarOpen = true,
  viewer,
  watchlists,
  warnings,
  workspaceClassName,
}: {
  children: React.ReactNode
  enableCopilotRail?: boolean
  initialCopilotOpen?: boolean
  initialSelectedModel?: ModelType | null
  initialSidebarOpen?: boolean
  viewer: AuthViewer
  watchlists: WatchlistRecord[]
  warnings: string[]
  workspaceClassName?: string
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
      <MarketSidebar watchlists={watchlists} />
      <SidebarInset className="h-svh min-h-0 overflow-hidden">
        <div className="flex h-full min-h-0 flex-col">
          <div className="border-b border-border/50 bg-background/95 backdrop-blur">
            <div className="z-10 flex h-[52px] shrink-0 items-center gap-2.5 px-3">
              <SidebarTrigger />

              <SymbolSearch
                className="max-w-none min-w-0 flex-1 md:max-w-md"
                inputClassName="h-9"
              />

              <div className="ml-auto flex shrink-0 items-center gap-1.5">
                {enableCopilotRail ? (
                  <MarketCopilotToggle
                    onToggle={() => {
                      setCopilotOpen((currentOpen) => !currentOpen)
                    }}
                    open={copilotOpen}
                  />
                ) : null}
                <AppLauncher className="size-7" />
                <UserMenu viewer={viewer} className="size-7" />
              </div>
            </div>
            <WarningStrip warnings={warnings} />
          </div>

          <div className="flex min-h-0 flex-1 overflow-hidden">
            <div
              className={cn(
                "market-workspace min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain",
                workspaceClassName
              )}
              data-copilot-open={enableCopilotRail && copilotOpen ? "true" : "false"}
            >
              {children}
            </div>
            {enableCopilotRail ? (
              <MarketCopilotSidebar
                initialSelectedModel={initialSelectedModel}
                onOpenChange={(open) => {
                  setCopilotOpen(open)
                }}
                open={copilotOpen}
                resetToken={0}
                viewer={viewer}
              />
            ) : null}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
