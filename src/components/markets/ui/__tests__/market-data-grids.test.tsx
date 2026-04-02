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

import { MetricGrid, QuoteStrip } from "../market-data-grids"

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

  it("colors the sparkline from the day change instead of the series slope", () => {
    const html = renderToStaticMarkup(
      <QuoteStrip
        quotes={[
          {
            avgVolume: null,
            change: 1.84,
            changesPercentage: 0.73,
            currency: "USD",
            dayHigh: null,
            dayLow: null,
            exchange: "NASDAQ",
            marketCap: null,
            name: "Apple Inc.",
            open: null,
            price: 255.63,
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
          AAPL: [255.4, 254.9, 254.1, 253.8, 253.2],
        }}
      />
    )

    expect(html).toContain("var(--vesper-teal)")
    expect(html).not.toContain("var(--vesper-orange)")
  })
})

describe("MetricGrid", () => {
  it("renders duplicate labels without a React key warning", () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined)

    try {
      const html = renderToStaticMarkup(
        <MetricGrid
          metrics={[
            { label: "Dividend Yield", value: 0.024 },
            { label: "Dividend Yield", value: 0.031 },
          ]}
        />
      )

      expect(html.match(/Dividend Yield/g)).toHaveLength(2)
      expect(consoleError).not.toHaveBeenCalledWith(
        expect.stringContaining("Encountered two children with the same key")
      )
    } finally {
      consoleError.mockRestore()
    }
  })
})
