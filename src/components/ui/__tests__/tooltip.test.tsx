import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("radix-ui", () => ({
  Tooltip: {
    Provider: ({
      children,
      delayDuration,
      disableHoverableContent,
    }: {
      children: React.ReactNode
      delayDuration?: number
      disableHoverableContent?: boolean
    }) => (
      <div
        data-delay-duration={String(delayDuration)}
        data-disable-hoverable-content={String(disableHoverableContent)}
      >
        {children}
      </div>
    ),
    Root: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Trigger: ({ children }: { children: React.ReactNode }) => (
      <button type="button">{children}</button>
    ),
    Portal: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    Content: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  },
}))

import { TooltipProvider } from "../tooltip"

describe("TooltipProvider", () => {
  it("disables hoverable content by default", () => {
    const html = renderToStaticMarkup(
      <TooltipProvider>
        <span>Hint</span>
      </TooltipProvider>
    )

    expect(html).toContain('data-delay-duration="0"')
    expect(html).toContain('data-disable-hoverable-content="true"')
  })

  it("lets callers override hoverable content behavior", () => {
    const html = renderToStaticMarkup(
      <TooltipProvider disableHoverableContent={false}>
        <span>Hint</span>
      </TooltipProvider>
    )

    expect(html).toContain('data-disable-hoverable-content="false"')
  })
})
