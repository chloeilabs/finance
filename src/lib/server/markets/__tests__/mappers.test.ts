import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../store", async () => {
  const actual = await vi.importActual("../store")

  return {
    ...actual,
    recordMarketApiUsage: vi.fn().mockResolvedValue(undefined),
  }
})

import { createCompanyClient } from "../client/company"
import { createPriceDataClient } from "../client/price-data"
import { createQuotesClient } from "../client/quotes"
import { createReferenceDataClient } from "../client/reference-data"

describe("market client mappers", () => {
  const originalFetch = globalThis.fetch
  const originalApiKey = process.env.FMP_API_KEY
  const originalBaseUrl = process.env.FMP_BASE_URL

  beforeEach(() => {
    process.env.FMP_API_KEY = "test-key"
    process.env.FMP_BASE_URL = "https://example.test"
  })

  afterEach(() => {
    globalThis.fetch = originalFetch

    if (originalApiKey === undefined) {
      delete process.env.FMP_API_KEY
    } else {
      process.env.FMP_API_KEY = originalApiKey
    }

    if (originalBaseUrl === undefined) {
      delete process.env.FMP_BASE_URL
    } else {
      process.env.FMP_BASE_URL = originalBaseUrl
    }
  })

  it("maps executives and share-float responses", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              currencyPay: "USD",
              name: "Jane Exec",
              pay: 1234567,
              title: "Chief Executive Officer",
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              date: "2026-03-29 00:00:00",
              floatShares: 100,
              freeFloat: 80.5,
              outstandingShares: 125,
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      ) as typeof fetch

    const client = createCompanyClient()

    await expect(client.getKeyExecutives("AAPL")).resolves.toEqual([
      {
        currencyPay: "USD",
        name: "Jane Exec",
        pay: 1234567,
        title: "Chief Executive Officer",
      },
    ])

    await expect(client.getShareFloat("AAPL")).resolves.toEqual({
      date: "2026-03-29 00:00:00",
      floatShares: 100,
      freeFloatPercentage: 80.5,
      outstandingShares: 125,
    })
  })

  it("maps latest insider tape entries", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            filingDate: "2026-03-29",
            price: 12.5,
            reportingName: "Dana Insider",
            securitiesTransacted: 5000,
            symbol: "AAPL",
            transactionDate: "2026-03-28",
            transactionType: "Buy",
          },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    ) as typeof fetch

    const client = createReferenceDataClient()

    await expect(client.insider.getLatestInsiderTrades(5)).resolves.toEqual([
      {
        filingDate: "2026-03-29",
        price: 12.5,
        reportingName: "Dana Insider",
        securitiesTransacted: 5000,
        symbol: "AAPL",
        transactionDate: "2026-03-28",
        transactionType: "Buy",
      },
    ])
  })

  it("maps multi-asset quote and compact chart responses", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              change: 310,
              changePercentage: 0.46743,
              currency: "USD",
              name: "Bitcoin USD",
              price: 66630.15,
              symbol: "BTCUSD",
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              close: 66581.82,
              date: "2026-03-29",
              open: 66490.1,
              high: 66710.3,
              low: 66380.4,
              volume: 222164543,
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      ) as typeof fetch

    const quotesClient = createQuotesClient()
    const priceClient = createPriceDataClient()

    await expect(quotesClient.getQuote("BTCUSD")).resolves.toMatchObject({
      currency: "USD",
      name: "Bitcoin USD",
      price: 66630.15,
      symbol: "BTCUSD",
    })

    await expect(
      priceClient.charts.getEodChart("BTCUSD", { limit: 1 })
    ).resolves.toEqual([
      {
        close: 66581.82,
        date: "2026-03-29",
        high: 66710.3,
        low: 66380.4,
        open: 66490.1,
        volume: 222164543,
      },
    ])
  })
})
