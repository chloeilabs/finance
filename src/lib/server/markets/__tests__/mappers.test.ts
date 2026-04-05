import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("../store", async () => {
  const actual = await vi.importActual("../store")

  return {
    ...actual,
    recordMarketApiUsage: vi.fn().mockResolvedValue(undefined),
  }
})

import { createCompanyClient } from "../client/company"
import { createDirectoryClient } from "../client/directory"
import { createFundamentalsClient } from "../client/fundamentals"
import { createMarketStructureClient } from "../client/market-structure"
import { createPriceDataClient } from "../client/price-data"
import { createQuotesClient } from "../client/quotes"
import { createReferenceDataClient } from "../client/reference-data"
import { createResearchClient } from "../client/research"

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

  it("maps ETF info, holdings, and allocation responses", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              assetClass: "Equity",
              category: "Large Value",
              description: "Fund summary",
              dividendYield: 0.0346,
              etfName: "Schwab US Dividend Equity ETF",
              exchange: "NYSEARCA",
              expenseRatio: 0.0006,
              frequency: "Quarterly",
              holdings: 104,
              inceptionDate: "2011-10-20",
              issuer: "Charles Schwab",
              peRatio: 17.61,
              region: "North America",
              sharesOutstanding: 2780000000,
              symbol: "SCHD",
              totalAssets: 84450000000,
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
              asset: "HD",
              marketValue: 1234567,
              name: "Home Depot",
              sharesNumber: 4567,
              weightPercentage: 0.0432,
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
              sector: "Industrials",
              weightPercentage: 0.182,
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
              country: "United States",
              weightPercentage: 0.985,
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      ) as typeof fetch

    const client = createReferenceDataClient()

    await expect(client.etf.getInfo("SCHD")).resolves.toEqual({
      assetClass: "Equity",
      assets: 84450000000,
      beta: null,
      category: "Large Value",
      currency: null,
      description: "Fund summary",
      dividendPerShare: null,
      dividendYield: 0.0346,
      domicile: null,
      exchange: "NYSEARCA",
      exDividendDate: null,
      expenseRatio: 0.0006,
      frequency: "Quarterly",
      inceptionDate: "2011-10-20",
      indexTracked: null,
      name: "Schwab US Dividend Equity ETF",
      nav: null,
      peRatio: 17.61,
      provider: "Charles Schwab",
      region: "North America",
      sharesOutstanding: 2780000000,
      symbol: "SCHD",
      totalHoldings: 104,
      website: null,
    })

    await expect(client.etf.getHoldings("SCHD")).resolves.toEqual([
      {
        marketValue: 1234567,
        name: "Home Depot",
        sharesNumber: 4567,
        symbol: "HD",
        weightPercentage: 0.0432,
      },
    ])

    await expect(client.etf.getSectorWeightings("SCHD")).resolves.toEqual([
      {
        label: "Industrials",
        weightPercentage: 0.182,
      },
    ])

    await expect(client.etf.getCountryWeightings("SCHD")).resolves.toEqual([
      {
        label: "United States",
        weightPercentage: 0.985,
      },
    ])
  })

  it("maps quote fields including eps, pe, and earningsAnnouncement", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            change: 1.5,
            changePercentage: 0.85,
            currency: "USD",
            earningsAnnouncement: "2026-07-31T00:00:00.000+0000",
            eps: 7.73,
            exchange: "NASDAQ",
            name: "Apple Inc.",
            pe: 28.91,
            price: 228.5,
            sharesOutstanding: 15022100000,
            symbol: "AAPL",
            volume: 45123456,
          },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    ) as typeof fetch

    const quotesClient = createQuotesClient()
    const result = await quotesClient.getQuote("AAPL")

    expect(result).toMatchObject({
      eps: 7.73,
      pe: 28.91,
      sharesOutstanding: 15022100000,
      earningsAnnouncement: "2026-07-31T00:00:00.000+0000",
      symbol: "AAPL",
    })
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
        adjustedClose: null,
        close: 66581.82,
        date: "2026-03-29",
        high: 66710.3,
        low: 66380.4,
        open: 66490.1,
        volume: 222164543,
      },
    ])
  })

  it("maps treasury rates with the 30 year tenor for macro panels", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            date: "2026-04-03",
            month3: 3.71,
            year2: 3.84,
            year10: 4.35,
            year30: 4.91,
          },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    ) as typeof fetch

    const client = createMarketStructureClient()

    await expect(client.macro.getTreasuryRates()).resolves.toEqual([
      {
        date: "2026-04-03",
        label: "3M Treasury",
        previous: null,
        value: 3.71,
      },
      {
        date: "2026-04-03",
        label: "2Y Treasury",
        previous: null,
        value: 3.84,
      },
      {
        date: "2026-04-03",
        label: "10Y Treasury",
        previous: null,
        value: 4.35,
      },
      {
        date: "2026-04-03",
        label: "30Y Treasury",
        previous: null,
        value: 4.91,
      },
    ])
  })

  it("falls back to the next available treasury tenor when 30 year is unavailable", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            date: "2026-04-03",
            month3: 3.71,
            month6: 3.73,
            year1: 3.72,
            year2: 3.84,
            year5: 3.99,
            year7: 4.17,
            year10: 4.35,
            year30: null,
          },
        ]),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    ) as typeof fetch

    const client = createMarketStructureClient()

    await expect(client.macro.getTreasuryRates().then((rates) => rates.slice(0, 4)))
      .resolves.toEqual([
        {
          date: "2026-04-03",
          label: "3M Treasury",
          previous: null,
          value: 3.71,
        },
        {
          date: "2026-04-03",
          label: "2Y Treasury",
          previous: null,
          value: 3.84,
        },
        {
          date: "2026-04-03",
          label: "10Y Treasury",
          previous: null,
          value: 4.35,
        },
        {
          date: "2026-04-03",
          label: "5Y Treasury",
          previous: null,
          value: 3.99,
        },
      ])
  })

  it("includes BTCUSD in the benchmark quote set", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              name: "S&P 500",
              price: 6582.69,
              symbol: "^GSPC",
            },
            {
              name: "NASDAQ Composite",
              price: 21879.18,
              symbol: "^IXIC",
            },
            {
              name: "Dow Jones Industrial Average",
              price: 46504.67,
              symbol: "^DJI",
            },
            {
              name: "Ignore Me",
              price: 999,
              symbol: "SPY",
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
      ) as typeof fetch

    const quotesClient = createQuotesClient()
    const benchmarks = await quotesClient.getIndexQuotes()

    expect(benchmarks.map((quote) => quote.symbol)).toEqual([
      "^GSPC",
      "^IXIC",
      "^DJI",
      "BTCUSD",
    ])
    expect(benchmarks[3]).toMatchObject({
      currency: "USD",
      name: "Bitcoin USD",
      price: 66630.15,
      symbol: "BTCUSD",
    })
  })

  it("preserves dividend scaling across ratios, events, and screener rows", async () => {
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              dividendPerShareTTM: 1.04,
              dividendPayoutRatioTTM: 0.18,
              dividendYieldTTM: 0.00406838,
              grossProfitMarginTTM: 0.45,
              operatingProfitMarginTTM: 0.31,
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
              date: "2026-05-01",
              declarationDate: "2026-04-10",
              dividend: 0.26,
              frequency: "quarterly",
              paymentDate: "2026-05-15",
              recordDate: "2026-05-12",
              symbol: "AAPL",
              yield: 0.3787051198019081,
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
              beta: 1.2,
              companyName: "Apple Inc.",
              lastAnnualDividend: 1.04,
              marketCap: 100,
              price: 10,
              symbol: "AAPL",
              volume: 5000,
            },
          ]),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        )
      ) as typeof fetch

    const fundamentalsClient = createFundamentalsClient()
    const researchClient = createResearchClient()
    const directoryClient = createDirectoryClient()

    await expect(fundamentalsClient.getRatiosTtm("AAPL")).resolves.toEqual(
      expect.arrayContaining([
        { label: "Dividend Yield", value: 0.00406838 },
        { label: "Dividend / Share", value: 1.04 },
        { label: "Payout Ratio", value: 0.18 },
      ])
    )

    await expect(researchClient.calendar.getDividends("AAPL")).resolves.toEqual([
      expect.objectContaining({
        declarationDate: "2026-04-10",
        eventDate: "2026-05-01",
        eventType: "dividend",
        frequency: "quarterly",
        paymentDate: "2026-05-15",
        recordDate: "2026-05-12",
        symbol: "AAPL",
        value: "0.26",
        yield: 0.3787051198019081,
      }),
    ])

    await expect(directoryClient.screenCompanies({ symbol: "AAPL" })).resolves.toEqual([
      expect.objectContaining({
        dividend: 1.04,
        symbol: "AAPL",
      }),
    ])
  })
})
