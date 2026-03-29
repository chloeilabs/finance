import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { HomePageContent } from "@/components/agent/home/home-content"
import { ThreadsProvider } from "@/components/agent/home/threads-context"
import { getModels } from "@/lib/actions/api-keys"
import { SIDEBAR_COOKIE_NAME } from "@/lib/constants"
import { isAuthConfigured } from "@/lib/server/auth"
import { getCurrentViewer } from "@/lib/server/auth-session"
import { listThreadsForUser } from "@/lib/server/threads"
import { resolveDefaultModel } from "@/lib/shared/llm/models"

function getSingleParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value
  const normalized = raw?.trim()

  if (!normalized) {
    return null
  }

  return normalized
}

export default async function CopilotPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  if (!isAuthConfigured()) {
    redirect("/sign-in")
  }

  const viewer = await getCurrentViewer()

  if (!viewer) {
    redirect("/sign-in")
  }

  const queryClient = new QueryClient()

  const availableModels = getModels()
  const initialThreads = await listThreadsForUser(viewer.id)
  const resolvedSearchParams = await searchParams
  const initialThreadId = getSingleParam(resolvedSearchParams.thread)
  const cookieStore = await cookies()
  const sidebarCookie = cookieStore.get(SIDEBAR_COOKIE_NAME)?.value
  const initialSidebarOpen = sidebarCookie ? sidebarCookie === "true" : true

  queryClient.setQueryData(["models"], availableModels)

  const resolvedInitialSelectedModel =
    availableModels.length > 0 ? resolveDefaultModel(availableModels) : null

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ThreadsProvider initialThreads={initialThreads}>
        <HomePageContent
          initialSelectedModel={resolvedInitialSelectedModel}
          initialThreadId={initialThreadId}
          initialSidebarOpen={initialSidebarOpen}
          viewer={viewer}
        />
      </ThreadsProvider>
    </HydrationBoundary>
  )
}
