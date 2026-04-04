import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}))

vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}))

vi.mock("@/components/markets/search/symbol-search", () => ({
  SymbolSearch: () => <div>Symbol search</div>,
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

vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SheetDescription: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SheetHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

import { PortfolioHoldingsPanel } from "../portfolio-holdings-panel"

describe("PortfolioHoldingsPanel", () => {
  it("keeps negative profit and loss values on one line and groups row actions", () => {
    const html = renderToStaticMarkup(
      <PortfolioHoldingsPanel
        holdings={[
          {
            analystConsensus: null,
            averageCost: 157.28,
            costBasis: 1571.28,
            createdAt: "2026-04-01T00:00:00.000Z",
            currency: "USD",
            dayChangePercent: -1.69,
            dayChangeValue: -20.4,
            dividendYieldTtm: null,
            id: "holding-1",
            instrumentKind: "stock",
            marketValue: 1186,
            name: "Example Corp.",
            nextEarningsDate: null,
            notes: null,
            price: 118.6,
            sector: "Technology",
            shares: 10,
            symbol: "EXM",
            targetWeight: null,
            unrealizedGainLoss: -28.68,
            unrealizedGainLossPercent: -0.0236,
            updatedAt: "2026-04-01T00:00:00.000Z",
            weight: 0.1729,
          },
        ]}
        portfolio={{
          baseCurrency: "USD",
          cashBalance: 12.38,
          createdAt: "2026-04-01T00:00:00.000Z",
          id: "portfolio-1",
          name: "Main Portfolio",
          updatedAt: "2026-04-01T00:00:00.000Z",
        }}
      />
    )

    expect(html).toMatch(/class="[^"]*whitespace-nowrap[^"]*">-\$20\.40<\/div>/)
    expect(html).toMatch(/class="[^"]*whitespace-nowrap[^"]*">-1\.69%<\/div>/)
    expect(html).toMatch(/class="[^"]*whitespace-nowrap[^"]*">-\$28\.68<\/div>/)
    expect(html).toMatch(/class="[^"]*whitespace-nowrap[^"]*">-2\.36%<\/div>/)
    expect(html).toMatch(/class="[^"]*whitespace-nowrap[^"]*">Total P\/L<\/th>/)
    expect(html).toContain("Holding actions")
    expect(html).toContain("Edit holding")
    expect(html).toContain("Delete holding")
  })
})
