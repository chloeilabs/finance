import { writeFile } from "node:fs/promises"
import process from "node:process"

import {
  FMP_CAPABILITY_KEYS,
  FMP_PLAN_TIERS,
} from "./src/lib/shared/markets/plan.ts"
import {
  deriveStarterCapabilitiesFromDatasetIds,
  deriveStarterIntradayIntervalsFromDatasetIds,
  getStarterDatasetDefinitions,
} from "./src/lib/shared/markets/starter-datasets.ts"

const apiKey = process.env.FMP_API_KEY?.trim()
const shouldWriteSnapshot = process.argv.includes("--write")
const generatedSnapshotUrl = new URL(
  "./src/lib/shared/markets/fmp-plan-validation.generated.ts",
  import.meta.url
)
const planTier = getPlanTier()
const coverageScopeByTier = {
  PREMIUM: "usUkCanada",
  STARTER: "us",
  ULTIMATE: "global",
}

if (!apiKey) {
  console.error("Missing FMP_API_KEY.")
  process.exit(1)
}

const datasets = getStarterDatasetDefinitions()

function buildUrl(path, params = {}) {
  const url = new URL(`https://financialmodelingprep.com${path}`)

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue
    }

    url.searchParams.set(key, String(value))
  }

  url.searchParams.set("apikey", apiKey)
  return url.toString()
}

const results = []

for (const dataset of datasets) {
  try {
    const response = await fetch(buildUrl(dataset.path, dataset.probeParams), {
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
      category: dataset.category,
      name: dataset.id,
      ok: response.ok,
      restricted,
      sample: body,
      status: response.status,
    })
  } catch (error) {
    results.push({
      accessible: false,
      category: dataset.category,
      name: dataset.id,
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
  const accessibleDatasets = results
    .filter((result) => result.accessible)
    .map((result) => result.name)
    .sort()
  const restrictedDatasets = results
    .filter((result) => !result.accessible)
    .map((result) => result.name)
    .sort()
  const intradayIntervals =
    deriveStarterIntradayIntervalsFromDatasetIds(accessibleDatasets)

  return {
    accessibleDatasets,
    accessibleProbes: accessibleDatasets,
    capabilities: deriveStarterCapabilitiesFromDatasetIds(accessibleDatasets),
    coverageScope: coverageScopeByTier[planTier],
    intradayIntervals,
    restrictedDatasets,
    restrictedProbes: restrictedDatasets,
    source: "pnpm markets:capabilities:write",
    validatedAt: new Date().toISOString(),
  }
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
    'import type { FmpPlanValidationSnapshots } from "./fmp-plan-validation.ts"',
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
    renderStringArray("accessibleDatasets", snapshot.accessibleDatasets, 4),
    renderStringArray("accessibleProbes", snapshot.accessibleProbes, 4),
    "    capabilities: {",
    ...capabilityEntries.map(
      ([capability, value]) => `      ${capability}: ${value},`
    ),
    "    },",
    `    coverageScope: ${JSON.stringify(snapshot.coverageScope)},`,
    renderStringArray("intradayIntervals", snapshot.intradayIntervals, 4),
    renderStringArray("restrictedDatasets", snapshot.restrictedDatasets, 4),
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
