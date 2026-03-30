import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

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

import { QuoteStrip } from "../market-data-grids"

describe("QuoteStrip", () => {
  it("renders sparklines when series data is provided", () => {
    const html = renderToStaticMarkup(
      <QuoteStrip
        quotes={[
          {
            avgVolume: null,
            change: -4.09,
            changesPercentage: -1.62,
            currency: "USD",
            dayHigh: null,
            dayLow: null,
            exchange: "NASDAQ",
            marketCap: null,
            name: "Apple Inc.",
            open: null,
            price: 248.8,
            priceAvg50: null,
            priceAvg200: null,
            symbol: "AAPL",
            timestamp: null,
            volume: null,
            yearHigh: null,
            yearLow: null,
          },
        ]}
        sparklines={{
          AAPL: [255.4, 253.9, 252.2, 250.8, 248.8],
        }}
      />
    )

    expect(html).toContain("AAPL")
    expect(html).toContain("<svg")
    expect(html).toContain("<path")
  })
})
