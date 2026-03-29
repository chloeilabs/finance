import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { MarketShell } from "@/components/markets/layout/market-shell"
import {
  MARKET_COPILOT_COOKIE_NAME,
  SIDEBAR_COOKIE_NAME,
} from "@/lib/constants"
import { isAuthConfigured } from "@/lib/server/auth"
import { getCurrentViewer } from "@/lib/server/auth-session"
import { getMarketSidebarData } from "@/lib/server/markets/service"

export default async function MarketLayout({
  children,
}: {
  children: React.ReactNode
}) {
  if (!isAuthConfigured()) {
    redirect("/sign-in")
  }

  const viewer = await getCurrentViewer()

  if (!viewer) {
    redirect("/sign-in")
  }

  const { watchlists, warnings } = await getMarketSidebarData(viewer.id)
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value
  const copilotCookie = cookieStore.get(MARKET_COPILOT_COOKIE_NAME)?.value
  const initialSidebarOpen = sidebarCookie ? sidebarCookie === "true" : true
  const initialCopilotOpen = copilotCookie ? copilotCookie === "true" : false

  return (
    <MarketShell
      initialCopilotOpen={initialCopilotOpen}
      initialSidebarOpen={initialSidebarOpen}
      viewer={viewer}
      warnings={warnings}
      watchlists={watchlists}
    >
      {children}
    </MarketShell>
  )
}
