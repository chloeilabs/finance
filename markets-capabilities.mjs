import process from "node:process"

const apiKey = process.env.FMP_API_KEY?.trim()

if (!apiKey) {
  console.error("Missing FMP_API_KEY.")
  process.exit(1)
}

const probes = [
  ["quote", "/stable/quote?symbol=AAPL"],
  ["intraday-5m", "/stable/historical-chart/5min?symbol=AAPL"],
  [
    "technical-rsi",
    "/stable/technical-indicators/rsi?symbol=AAPL&periodLength=14&timeframe=1day",
  ],
  ["price-target-consensus", "/stable/price-target-consensus?symbol=AAPL"],
  ["grades-consensus", "/stable/grades-consensus?symbol=AAPL"],
  ["analyst-estimates", "/stable/analyst-estimates?symbol=AAPL&period=annual"],
  ["earnings-calendar", "/stable/earnings-calendar?from=2026-03-28&to=2026-04-10"],
  ["economic-calendar", "/stable/economic-calendar?from=2026-03-28&to=2026-04-10"],
  ["sec-filings", "/stable/sec-filings-search/symbol?symbol=AAPL&from=2025-10-01&to=2026-03-28"],
  ["financial-scores", "/stable/financial-scores?symbol=AAPL"],
  ["product-segmentation", "/stable/revenue-product-segmentation?symbol=AAPL"],
  ["employee-history", "/stable/historical-employee-count?symbol=AAPL"],
  ["market-hours", "/stable/exchange-market-hours?exchange=NASDAQ"],
  ["sector-pe", "/stable/sector-pe-snapshot?date=2026-03-27"],
  ["risk-premium", "/stable/market-risk-premium"],
  ["general-news", "/stable/news/general-latest?page=0&limit=5"],
  ["batch-quote", "/stable/batch-quote?symbols=AAPL,MSFT"],
  ["batch-index-quotes", "/stable/batch-index-quotes"],
  ["etf-exposure", "/stable/etf/asset-exposure?symbol=AAPL"],
  [
    "institutional-ownership",
    "/stable/institutional-ownership/extract-analytics/holder?symbol=AAPL&year=2025&quarter=4",
  ],
  ["press-releases", "/stable/news/press-releases?symbols=AAPL&page=0&limit=5"],
]

function buildUrl(path) {
  return `https://financialmodelingprep.com${path}${path.includes("?") ? "&" : "?"}apikey=${encodeURIComponent(apiKey)}`
}

const results = []

for (const [name, path] of probes) {
  try {
    const response = await fetch(buildUrl(path), {
      headers: { Accept: "application/json" },
    })
    const body = (await response.text()).slice(0, 140).replace(/\s+/g, " ")

    results.push({
      name,
      status: response.status,
      ok: response.ok,
      restricted:
        response.status === 402 || body.toLowerCase().includes("restricted endpoint"),
      sample: body,
    })
  } catch (error) {
    results.push({
      name,
      status: "ERR",
      ok: false,
      restricted: false,
      sample: String(error),
    })
  }
}

console.table(results)
