import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}))

import {
  SidebarMenuButton,
  SidebarMenuSkeleton,
  SidebarMenuSubButton,
  SidebarProvider,
} from "../sidebar"

describe("Sidebar", () => {
  it("omits data-active for inactive menu buttons", () => {
    const html = renderToStaticMarkup(
      <SidebarProvider>
        <SidebarMenuButton isActive={false}>Home</SidebarMenuButton>
      </SidebarProvider>
    )

    expect(html).not.toContain("data-active=")
  })

  it("renders data-active for active menu buttons", () => {
    const html = renderToStaticMarkup(
      <SidebarProvider>
        <SidebarMenuButton isActive>Home</SidebarMenuButton>
      </SidebarProvider>
    )

    expect(html).toContain('data-active="true"')
  })

  it("omits data-active for inactive sub menu buttons", () => {
    const html = renderToStaticMarkup(
      <SidebarMenuSubButton href="/copilot" isActive={false}>
        Copilot
      </SidebarMenuSubButton>
    )

    expect(html).not.toContain("data-active=")
  })

  it("uses a deterministic skeleton width", () => {
    const firstHtml = renderToStaticMarkup(<SidebarMenuSkeleton />)
    const secondHtml = renderToStaticMarkup(<SidebarMenuSkeleton />)
    const widthPattern = /--skeleton-width:([^;"']+)/
    const firstMatch = widthPattern.exec(firstHtml)
    const secondMatch = widthPattern.exec(secondHtml)

    expect(firstMatch?.[1]).toBeDefined()
    expect(firstMatch?.[1]).toBe(secondMatch?.[1])
  })
})
