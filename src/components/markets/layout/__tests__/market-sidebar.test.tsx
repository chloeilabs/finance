import type { ComponentProps, ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const mockThreadsContext = {
  currentThreadId: "thread-1",
  threads: [
    {
      createdAt: "2026-04-01T00:00:00.000Z",
      id: "thread-1",
      isPinned: false,
      messages: [],
      title: "Bull case",
      updatedAt: "2026-04-01T00:00:00.000Z",
    },
  ],
  setCurrentThreadId: vi.fn(),
}

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
  useOptionalThreads: () => mockThreadsContext,
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
  it("renders Copilot directly after News in the primary navigation", () => {
    const html = renderToStaticMarkup(<MarketSidebar watchlists={[]} />)

    const overviewIndex = html.indexOf("Overview")
    const portfolioIndex = html.indexOf("Portfolio")
    const newsIndex = html.indexOf("News")
    const copilotIndex = html.indexOf("Copilot")

    expect(overviewIndex).toBeGreaterThan(-1)
    expect(portfolioIndex).toBeGreaterThan(overviewIndex)
    expect(newsIndex).toBeGreaterThan(portfolioIndex)
    expect(copilotIndex).toBeGreaterThan(newsIndex)
  })

  it("removes chat history controls from the market sidebar", () => {
    const html = renderToStaticMarkup(<MarketSidebar watchlists={[]} />)

    expect(html).toContain("Copilot")
    expect(html).not.toContain("Search chats")
    expect(html).not.toContain("Your chats")
    expect(html).not.toContain("Bull case")
  })
})
