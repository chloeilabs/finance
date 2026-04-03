import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

const usePathname = vi.fn<() => string>()

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  usePathname: () => usePathname(),
}))

import { TickerTabNav } from "../ticker-tab-nav"

describe("TickerTabNav", () => {
  it("marks only the exact overview tab as active on the base route", () => {
    usePathname.mockReturnValue("/stocks/AAPL")

    const html = renderToStaticMarkup(
      <TickerTabNav
        items={[
          { exact: true, href: "/stocks/AAPL", label: "Overview" },
          { href: "/stocks/AAPL/financials", label: "Financials" },
        ]}
      />
    )

    expect(html).toContain("Overview</a>")
    expect(html).toContain("border-primary")
    expect(html).toContain("/stocks/AAPL/financials")
  })

  it("activates the matching child tab without keeping overview active", () => {
    usePathname.mockReturnValue("/stocks/AAPL/financials")

    const html = renderToStaticMarkup(
      <TickerTabNav
        items={[
          { exact: true, href: "/stocks/AAPL", label: "Overview" },
          { href: "/stocks/AAPL/financials", label: "Financials" },
        ]}
      />
    )

    expect(html).toContain('href="/stocks/AAPL/financials"')
    expect(html).toContain(">Overview</a>")
    expect(html).toContain(">Financials</a>")
    expect(html).toContain("border-transparent text-muted-foreground")
    expect(html).toContain("border-primary text-foreground")
  })
})
