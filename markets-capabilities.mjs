import { writeFile } from "node:fs/promises"
import process from "node:process"

import { createMarketDateClock } from "./src/lib/shared/markets/market-clock.ts"
import {
  FMP_CAPABILITY_KEYS,
  FMP_INTRADAY_INTERVALS,
  FMP_PLAN_TIERS,
} from "./src/lib/shared/markets/plan.ts"

const apiKey = process.env.FMP_API_KEY?.trim()
const shouldWriteSnapshot = process.argv.includes("--write")
const generatedSnapshotUrl = new URL(
  "./src/lib/shared/markets/fmp-plan-validation.generated.ts",
  import.meta.url
)
const planTier = getPlanTier()
const clock = createMarketDateClock()
const calendarFrom = clock.minusDays(1)
const calendarTo = clock.plusDays(14)
const filingsFrom = clock.minusDays(180)
const filingsTo = clock.today
const sectorPeDate = findPreviousWeekdayIsoDate(clock)
const coverageScopeByTier = {
  PREMIUM: "usUkCanada",
  STARTER: "us",
  ULTIMATE: "global",
}

if (!apiKey) {
  console.error("Missing FMP_API_KEY.")
  process.exit(1)
}

const probes = [
  ["quote", "/stable/quote?symbol=AAPL"],
  ...FMP_INTRADAY_INTERVALS.map((interval) => [
    `intraday-${interval}`,
    `/stable/historical-chart/${interval}?symbol=AAPL`,
  ]),
  [
    "technical-rsi",
    "/stable/technical-indicators/rsi?symbol=AAPL&periodLength=14&timeframe=1day",
  ],
  ["price-target-consensus", "/stable/price-target-consensus?symbol=AAPL"],
  ["grades-consensus", "/stable/grades-consensus?symbol=AAPL"],
  ["analyst-estimates", "/stable/analyst-estimates?symbol=AAPL&period=annual"],
  [
    "earnings-calendar",
    `/stable/earnings-calendar?from=${calendarFrom}&to=${calendarTo}`,
  ],
  [
    "economic-calendar",
    `/stable/economic-calendar?from=${calendarFrom}&to=${calendarTo}`,
  ],
  [
    "sec-filings",
    `/stable/sec-filings-search/symbol?symbol=AAPL&from=${filingsFrom}&to=${filingsTo}`,
  ],
  ["dcf", "/stable/levered-discounted-cash-flow?symbol=AAPL"],
  ["financial-scores", "/stable/financial-scores?symbol=AAPL"],
  ["product-segmentation", "/stable/revenue-product-segmentation?symbol=AAPL"],
  ["employee-history", "/stable/historical-employee-count?symbol=AAPL"],
  ["market-hours", "/stable/exchange-market-hours?exchange=NASDAQ"],
  ["sector-pe", `/stable/sector-pe-snapshot?date=${sectorPeDate}`],
  ["risk-premium", "/stable/market-risk-premium"],
  ["general-news", "/stable/news/general-latest?page=0&limit=5"],
  ["key-executives", "/stable/key-executives?symbol=AAPL"],
  ["shares-float", "/stable/shares-float?symbol=AAPL"],
  [
    "insider-trading-symbol",
    "/stable/insider-trading?symbol=AAPL&page=0&limit=5",
  ],
  ["insider-latest", "/stable/insider-trading/latest?page=0&limit=5"],
  ["esg-ratings", "/stable/esg-ratings?symbol=AAPL"],
  [
    "earnings-transcripts",
    "/stable/earning-call-transcript?symbol=AAPL&year=2025&quarter=4",
  ],
  ["crypto-quote", "/stable/quote?symbol=BTCUSD"],
  ["crypto-intraday-5m", "/stable/historical-chart/5min?symbol=BTCUSD"],
  ["forex-quote", "/stable/quote?symbol=EURUSD"],
  ["forex-intraday-5m", "/stable/historical-chart/5min?symbol=EURUSD"],
  ["commodity-quote", "/stable/quote?symbol=GCUSD"],
  ["commodity-intraday-5m", "/stable/historical-chart/5min?symbol=GCUSD"],
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
    const rawBody = await response.text()
    const body = rawBody.slice(0, 140).replace(/\s+/g, " ")
    const payload = parseJson(rawBody)
    const accessible = response.ok && hasProbeData(payload)
    const restricted =
      !accessible &&
      (response.status === 402 ||
        response.status === 404 ||
        body.toLowerCase().includes("restricted endpoint"))

    results.push({
      accessible,
      name,
      ok: response.ok,
      restricted,
      sample: body,
      status: response.status,
    })
  } catch (error) {
    results.push({
      accessible: false,
      name,
      ok: false,
      restricted: false,
      sample: String(error),
      status: "ERR",
    })
  }
}

console.table(results)

const snapshot = createSnapshot(results)
const indeterminateFailures = results.filter(
  (result) => !result.accessible && !result.restricted
)

if (indeterminateFailures.length > 0) {
  console.error(
    "Capability probes returned indeterminate failures. Review the table before updating the stored snapshot."
  )
}

if (shouldWriteSnapshot) {
  if (indeterminateFailures.length > 0) {
    process.exitCode = 1
  } else {
    const snapshots = await loadExistingSnapshots()
    snapshots[planTier] = snapshot

    await writeFile(
      generatedSnapshotUrl,
      renderGeneratedSnapshots(snapshots),
      "utf8"
    )

    console.log(
      `Updated ${generatedSnapshotUrl.pathname} for ${planTier} at ${snapshot.validatedAt}.`
    )
  }
}

function getPlanTier() {
  const candidate = process.env.FMP_PLAN_TIER?.trim().toUpperCase()

  if (candidate && FMP_PLAN_TIERS.includes(candidate)) {
    return candidate
  }

  return "STARTER"
}

function findPreviousWeekdayIsoDate(marketClock) {
  let offset = 0

  while (offset < 7) {
    const isoDate =
      offset === 0 ? marketClock.today : marketClock.minusDays(offset)
    const day = new Date(`${isoDate}T00:00:00.000Z`).getUTCDay()

    if (day !== 0 && day !== 6) {
      return isoDate
    }

    offset += 1
  }

  return marketClock.minusDays(1)
}

function parseJson(value) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function hasProbeData(payload) {
  if (payload === null || payload === undefined) {
    return false
  }

  if (Array.isArray(payload)) {
    return payload.length > 0
  }

  if (typeof payload === "object") {
    return Object.keys(payload).length > 0
  }

  if (typeof payload === "string") {
    return payload.trim().length > 0
  }

  return true
}

function createSnapshot(results) {
  const accessibleProbes = results
    .filter((result) => result.accessible)
    .map((result) => result.name)
    .sort()
  const restrictedProbes = results
    .filter((result) => !result.accessible)
    .map((result) => result.name)
    .sort()
  const accessibleProbeSet = new Set(accessibleProbes)
  const intradayIntervals = FMP_INTRADAY_INTERVALS.filter((interval) =>
    accessibleProbeSet.has(`intraday-${interval}`)
  )

  return {
    accessibleProbes,
    capabilities: deriveCapabilities(accessibleProbeSet, intradayIntervals),
    coverageScope: coverageScopeByTier[planTier],
    intradayIntervals,
    restrictedProbes,
    source: "pnpm markets:capabilities:write",
    validatedAt: new Date().toISOString(),
  }
}

function deriveCapabilities(accessibleProbeSet, intradayIntervals) {
  const derived = {
    realtimeQuotes: accessibleProbeSet.has("quote"),
    intradayCharts: intradayIntervals.length > 0,
    technicalIndicators: accessibleProbeSet.has("technical-rsi"),
    batchQuotes: accessibleProbeSet.has("batch-quote"),
    batchIndexQuotes: accessibleProbeSet.has("batch-index-quotes"),
    analystInsights:
      accessibleProbeSet.has("price-target-consensus") &&
      accessibleProbeSet.has("grades-consensus") &&
      accessibleProbeSet.has("analyst-estimates"),
    insiderTrades: accessibleProbeSet.has("insider-trading-symbol"),
    latestInsiderFeed: accessibleProbeSet.has("insider-latest"),
    ownership: accessibleProbeSet.has("institutional-ownership"),
    etfAssetExposure: accessibleProbeSet.has("etf-exposure"),
    secFilings: accessibleProbeSet.has("sec-filings"),
    economics:
      accessibleProbeSet.has("earnings-calendar") &&
      accessibleProbeSet.has("economic-calendar") &&
      accessibleProbeSet.has("market-hours"),
    esgRatings: accessibleProbeSet.has("esg-ratings"),
    dcf: accessibleProbeSet.has("dcf"),
    earningsTranscripts: accessibleProbeSet.has("earnings-transcripts"),
    pressReleases: accessibleProbeSet.has("press-releases"),
    companyExecutives: accessibleProbeSet.has("key-executives"),
    shareFloatLiquidity: accessibleProbeSet.has("shares-float"),
    cryptoMarkets:
      accessibleProbeSet.has("crypto-quote") &&
      accessibleProbeSet.has("crypto-intraday-5m"),
    forexMarkets:
      accessibleProbeSet.has("forex-quote") &&
      accessibleProbeSet.has("forex-intraday-5m"),
    commodityMarkets:
      accessibleProbeSet.has("commodity-quote") &&
      accessibleProbeSet.has("commodity-intraday-5m"),
  }

  return Object.fromEntries(
    FMP_CAPABILITY_KEYS.filter((key) => key in derived).map((key) => [
      key,
      derived[key],
    ])
  )
}

async function loadExistingSnapshots() {
  try {
    const module =
      await import("./src/lib/shared/markets/fmp-plan-validation.generated.ts")

    return { ...module.FMP_PLAN_VALIDATION_SNAPSHOTS }
  } catch {
    return {}
  }
}

function renderGeneratedSnapshots(snapshots) {
  const sections = FMP_PLAN_TIERS.filter((tier) => snapshots[tier]).map(
    (tier) => renderSnapshot(tier, snapshots[tier])
  )

  return [
    'import type { FmpPlanValidationSnapshots } from "./fmp-plan-validation"',
    "",
    "export const FMP_PLAN_VALIDATION_SNAPSHOTS: FmpPlanValidationSnapshots = {",
    sections.join("\n"),
    "}",
    "",
  ].join("\n")
}

function renderSnapshot(tier, snapshot) {
  const capabilityEntries = Object.entries(snapshot.capabilities).sort(
    ([left], [right]) => {
      const leftIndex = FMP_CAPABILITY_KEYS.indexOf(left)
      const rightIndex = FMP_CAPABILITY_KEYS.indexOf(right)
      return leftIndex - rightIndex
    }
  )

  return [
    `  ${tier}: {`,
    renderStringArray("accessibleProbes", snapshot.accessibleProbes, 4),
    "    capabilities: {",
    ...capabilityEntries.map(
      ([capability, value]) => `      ${capability}: ${value},`
    ),
    "    },",
    `    coverageScope: ${JSON.stringify(snapshot.coverageScope)},`,
    renderStringArray("intradayIntervals", snapshot.intradayIntervals, 4),
    renderStringArray("restrictedProbes", snapshot.restrictedProbes, 4),
    `    source: ${JSON.stringify(snapshot.source)},`,
    `    validatedAt: ${JSON.stringify(snapshot.validatedAt)},`,
    "  },",
  ].join("\n")
}

function renderStringArray(label, values, indentSize) {
  if (!values?.length) {
    return `${" ".repeat(indentSize)}${label}: [],`
  }

  return [
    `${" ".repeat(indentSize)}${label}: [`,
    ...values.map(
      (value) => `${" ".repeat(indentSize + 2)}${JSON.stringify(value)},`
    ),
    `${" ".repeat(indentSize)}],`,
  ].join("\n")
}
