import type { ComponentProps, ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("@/components/agent/home/app-sidebar-utils", () => ({
  sortThreadsByRecency: <T,>(threads: T[]) => threads,
}))

vi.mock("@/components/agent/home/thread-search-dialog", () => ({
  ThreadSearchDialog: () => null,
}))

vi.mock("@/components/agent/home/threads-context", () => ({
  useOptionalThreads: () => null,
}))

vi.mock("@/components/graphics/logo/logo-burst", () => ({
  LogoBurst: () => <div>Logo</div>,
}))

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuItem: ({ children }: { children: ReactNode }) => <button>{children}</button>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock("@/components/ui/sidebar", () => {
  const SidebarMenuButton = ({
    children,
    ...props
  }: ComponentProps<"button"> & { isActive?: boolean; tooltip?: string }) => (
    <button type="button" {...props}>
      {children}
    </button>
  )

  return {
    Sidebar: ({ children }: { children: ReactNode }) => <aside>{children}</aside>,
    SidebarContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SidebarGroup: ({ children }: { children: ReactNode }) => <section>{children}</section>,
    SidebarGroupContent: ({ children }: { children: ReactNode }) => (
      <div>{children}</div>
    ),
    SidebarHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SidebarInput: (props: ComponentProps<"input">) => <input {...props} />,
    SidebarMenu: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SidebarMenuAction: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SidebarMenuButton,
    SidebarMenuItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    SidebarRail: () => <div />,
    useSidebar: () => ({
      setOpenMobile: vi.fn(),
    }),
  }
})

import { MarketSidebar } from "../market-sidebar"

describe("MarketSidebar", () => {
  it("renders Portfolio before News in the primary navigation", () => {
    const html = renderToStaticMarkup(<MarketSidebar watchlists={[]} />)

    const overviewIndex = html.indexOf("Overview")
    const portfolioIndex = html.indexOf("Portfolio")
    const newsIndex = html.indexOf("News")

    expect(overviewIndex).toBeGreaterThan(-1)
    expect(portfolioIndex).toBeGreaterThan(overviewIndex)
    expect(newsIndex).toBeGreaterThan(portfolioIndex)
  })
})
