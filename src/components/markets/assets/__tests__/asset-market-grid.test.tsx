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

import { AssetTeaserGrid } from "../asset-market-grid"

describe("AssetTeaserGrid", () => {
  it("renders a sparkline for the lead symbol in each teaser card", () => {
    const html = renderToStaticMarkup(
      <AssetTeaserGrid
        groups={[
          {
            description: "Crypto majors",
            id: "crypto",
            items: [
              {
                eodChart: [
                  {
                    close: 65963.22,
                    date: "2026-03-25",
                    high: null,
                    low: null,
                    open: null,
                    volume: null,
                  },
                ],
                intradayChart: [
                  {
                    close: 66102.4,
                    date: "2026-03-29 13:00:00",
                    high: null,
                    low: null,
                    open: null,
                    volume: null,
                  },
                  {
                    close: 66058.7,
                    date: "2026-03-29 13:05:00",
                    high: null,
                    low: null,
                    open: null,
                    volume: null,
                  },
                  {
                    close: 65963.22,
                    date: "2026-03-29 13:10:00",
                    high: null,
                    low: null,
                    open: null,
                    volume: null,
                  },
                ],
                quote: {
                  avgVolume: null,
                  change: -355.18,
                  changesPercentage: -0.54,
                  currency: "USD",
                  dayHigh: null,
                  dayLow: null,
                  exchange: null,
                  marketCap: null,
                  name: "Bitcoin",
                  open: null,
                  price: 65963.22,
                  priceAvg50: null,
                  priceAvg200: null,
                  symbol: "BTCUSD",
                  timestamp: null,
                  volume: null,
                  yearHigh: null,
                  yearLow: null,
                },
                symbol: "BTCUSD",
              },
            ],
            title: "Crypto",
          },
        ]}
      />
    )

    expect(html).toContain("BTCUSD")
    expect(html).toContain("<svg")
    expect(html).toContain("<path")
  })
})
