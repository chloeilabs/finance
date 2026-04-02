import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/agent/home/app-launcher", () => ({
  AppLauncher: () => <div>Apps</div>,
}))

vi.mock("@/components/auth/user-menu", () => ({
  UserMenu: () => <div>User menu</div>,
}))

vi.mock("@/components/markets/layout/market-copilot-sidebar", () => ({
  MarketCopilotSidebar: () => <aside>Copilot sidebar</aside>,
  MarketCopilotToggle: () => <button type="button">Copilot</button>,
}))

vi.mock("@/components/markets/search/symbol-search", () => ({
  SymbolSearch: () => <div>Search symbols, companies, ETFs</div>,
}))

vi.mock("@/components/markets/ui/market-primitives", () => ({
  WarningStrip: ({ warnings }: { warnings: string[] }) => (
    <div>{warnings.join(" ")}</div>
  ),
}))

vi.mock("@/components/ui/sidebar", () => ({
  SidebarInset: ({
    children,
    className,
  }: {
    children: ReactNode
    className?: string
  }) => <div className={className}>{children}</div>,
  SidebarProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button type="button">Sidebar</button>,
}))

vi.mock("../market-sidebar", () => ({
  MarketSidebar: () => <aside>Market sidebar</aside>,
}))

import { MarketShell } from "../market-shell"

describe("MarketShell", () => {
  const viewer = {
    email: "markets@example.test",
    id: "user_123",
    name: "Markets Tester",
  }

  it("shows the symbol search by default", () => {
    const html = renderToStaticMarkup(
      <MarketShell viewer={viewer} warnings={[]} watchlists={[]}>
        <div>Workspace</div>
      </MarketShell>
    )

    expect(html).toContain("Search symbols, companies, ETFs")
  })

  it("hides the symbol search when the shell disables it", () => {
    const html = renderToStaticMarkup(
      <MarketShell
        showSymbolSearch={false}
        viewer={viewer}
        warnings={[]}
        watchlists={[]}
      >
        <div>Workspace</div>
      </MarketShell>
    )

    expect(html).not.toContain("Search symbols, companies, ETFs")
    expect(html).toContain("Workspace")
  })
})
