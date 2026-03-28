import { redirect } from "next/navigation"

import { MarketShell } from "@/components/markets/layout/market-shell"
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

  const { plan, watchlists, warnings } = await getMarketSidebarData(viewer.id)

  return (
    <MarketShell
      planLabel={plan.label}
      viewer={viewer}
      warnings={warnings}
      watchlists={watchlists}
    >
      {children}
    </MarketShell>
  )
}
