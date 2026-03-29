import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { ThreadsProvider } from "@/components/agent/home/threads-context"
import { MarketShell } from "@/components/markets/layout/market-shell"
import { getModels } from "@/lib/actions/api-keys"
import {
  MARKET_COPILOT_COOKIE_NAME,
  SIDEBAR_COOKIE_NAME,
} from "@/lib/constants"
import { isAuthConfigured } from "@/lib/server/auth"
import { getCurrentViewer } from "@/lib/server/auth-session"
import { getMarketSidebarData } from "@/lib/server/markets/service"
import { listThreadsForUser } from "@/lib/server/threads"
import { resolveDefaultModel } from "@/lib/shared/llm/models"

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
  const initialThreads = await listThreadsForUser(viewer.id)
  const queryClient = new QueryClient()
  const availableModels = getModels()
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value
  const copilotCookie = cookieStore.get(MARKET_COPILOT_COOKIE_NAME)?.value
  const initialSidebarOpen = sidebarCookie ? sidebarCookie === "true" : true
  const initialCopilotOpen = copilotCookie ? copilotCookie === "true" : false
  const initialSelectedModel =
    availableModels.length > 0 ? resolveDefaultModel(availableModels) : null

  queryClient.setQueryData(["models"], availableModels)

  return (
    <ThreadsProvider initialThreads={initialThreads}>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <MarketShell
          initialCopilotOpen={initialCopilotOpen}
          initialSelectedModel={initialSelectedModel}
          initialSidebarOpen={initialSidebarOpen}
          viewer={viewer}
          warnings={warnings}
          watchlists={watchlists}
        >
          {children}
        </MarketShell>
      </HydrationBoundary>
    </ThreadsProvider>
  )
}
