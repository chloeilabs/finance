import "server-only"

import {
  getStarterDatasetDefinitionMap,
  getStarterDatasetDefinitions,
  STARTER_DATASET_CATEGORIES,
  type StarterDatasetCategory,
  type StarterDatasetDefinition,
  type StarterDatasetId,
  type StarterDatasetQuery,
  type StarterDatasetQueryField,
  type StarterDatasetQueryValue,
  type StarterDatasetResult,
  type StarterDatasetResultRow,
} from "@/lib/shared/markets/starter-datasets"

import { withMarketCache } from "./cache"
import { fetchFmpJson } from "./client"
import { getFmpPlanValidationSummary } from "./config"

export interface StarterDatasetCatalogEntry {
  access: "accessible" | "restricted"
  definition: StarterDatasetDefinition
}

export interface StarterDatasetCategorySummary {
  accessible: StarterDatasetCatalogEntry[]
  category: StarterDatasetCategory
  restricted: StarterDatasetCatalogEntry[]
}

export interface StarterDatasetExplorerPageData {
  categorySummaries: StarterDatasetCategorySummary[]
  selectedEntry: StarterDatasetCatalogEntry
  selectedQuery: StarterDatasetQuery
  validation: ReturnType<typeof getFmpPlanValidationSummary>
  result: StarterDatasetResult | null
}

function getSearchParamValue(
  value: string | string[] | undefined
): string | undefined {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function toSortedQueryString(query: StarterDatasetQuery): string {
  const entries = Object.entries(query).sort(([left], [right]) =>
    left.localeCompare(right)
  )

  return JSON.stringify(entries)
}

function coerceQueryFieldValue(
  field: StarterDatasetQueryField,
  value: string
): StarterDatasetQuery[keyof StarterDatasetQuery] | undefined {
  const trimmed = value.trim()

  if (trimmed === "") {
    return undefined
  }

  switch (field.type) {
    case "boolean":
      if (trimmed === "true") {
        return true
      }

      if (trimmed === "false") {
        return false
      }

      return undefined
    case "number": {
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    default:
      return trimmed
  }
}

function buildSelectedQuery(
  definition: StarterDatasetDefinition,
  searchParams: Record<string, string | string[] | undefined>
): StarterDatasetQuery {
  const queryEntries = new Map<string, StarterDatasetQueryValue>(
    Object.entries(definition.defaultParams).filter(
      (
        entry
      ): entry is [string, StarterDatasetQueryValue] => entry[1] !== undefined
    )
  )

  for (const field of definition.queryFields ?? []) {
    const rawValue = getSearchParamValue(searchParams[field.key])

    if (rawValue === undefined) {
      continue
    }

    const coercedValue = coerceQueryFieldValue(field, rawValue)

    if (coercedValue === undefined) {
      queryEntries.delete(field.key)
      continue
    }

    queryEntries.set(field.key, coercedValue)
  }

  return Object.fromEntries(queryEntries)
}

function normalizeDatasetRows(raw: unknown): StarterDatasetResultRow[] {
  if (Array.isArray(raw)) {
    return raw.map((item, index) => {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        return item as StarterDatasetResultRow
      }

      return {
        index,
        value: item,
      }
    })
  }

  if (raw && typeof raw === "object") {
    return [raw as StarterDatasetResultRow]
  }

  if (raw === null || raw === undefined) {
    return []
  }

  return [{ value: raw }]
}

function getDatasetColumns(rows: StarterDatasetResultRow[]): string[] {
  const columns = new Set<string>()

  for (const row of rows) {
    for (const column of Object.keys(row)) {
      columns.add(column)
    }
  }

  return [...columns]
}

async function fetchStarterDatasetResult(
  definition: StarterDatasetDefinition,
  query: StarterDatasetQuery
): Promise<StarterDatasetResult> {
  const raw = await fetchFmpJson(definition.path, query)
  const rows = normalizeDatasetRows(raw)

  return {
    columns: getDatasetColumns(rows),
    datasetId: definition.id,
    fetchedAt: new Date().toISOString(),
    raw,
    rows,
  }
}

function getStarterDatasetAccessMap() {
  const validation = getFmpPlanValidationSummary()
  const accessibleDatasetIds = new Set(validation?.accessibleDatasets ?? [])
  const restrictedDatasetIds = new Set(validation?.restrictedDatasets ?? [])

  return {
    accessibleDatasetIds,
    restrictedDatasetIds,
    validation,
  }
}

export function getStarterDatasetCatalogEntries(): StarterDatasetCatalogEntry[] {
  const { accessibleDatasetIds, restrictedDatasetIds } =
    getStarterDatasetAccessMap()

  return getStarterDatasetDefinitions().map((definition) => {
    let access: StarterDatasetCatalogEntry["access"] =
      definition.starterAvailability

    if (accessibleDatasetIds.has(definition.id)) {
      access = "accessible"
    } else if (restrictedDatasetIds.has(definition.id)) {
      access = "restricted"
    }

    return {
      access,
      definition,
    }
  })
}

export function getStarterDatasetCategorySummaries(): StarterDatasetCategorySummary[] {
  const entries = getStarterDatasetCatalogEntries()

  return STARTER_DATASET_CATEGORIES.map((category) => ({
    accessible: entries.filter(
      (entry) =>
        entry.definition.category === category && entry.access === "accessible"
    ),
    category,
    restricted: entries.filter(
      (entry) =>
        entry.definition.category === category && entry.access === "restricted"
    ),
  }))
}

export async function getStarterDatasetExplorerPageData(
  searchParams: Record<string, string | string[] | undefined>
): Promise<StarterDatasetExplorerPageData> {
  const categorySummaries = getStarterDatasetCategorySummaries()
  const entryMap = new Map(
    categorySummaries
      .flatMap((summary) => [...summary.accessible, ...summary.restricted])
      .map((entry) => [entry.definition.id, entry] as const)
  )
  const definitionMap = getStarterDatasetDefinitionMap()
  const selectedDatasetId =
    getSearchParamValue(searchParams.dataset) ?? ("quote" satisfies StarterDatasetId)
  const fallbackDefinition = definitionMap.get("quote")

  if (!fallbackDefinition) {
    throw new Error("Starter dataset catalog is missing the quote dataset.")
  }

  const selectedDefinition =
    definitionMap.get(selectedDatasetId as StarterDatasetId) ?? fallbackDefinition
  const selectedEntry =
    entryMap.get(selectedDefinition.id) ?? {
      access: selectedDefinition.starterAvailability,
      definition: selectedDefinition,
    }
  const selectedQuery = buildSelectedQuery(selectedDefinition, searchParams)
  const validation = getFmpPlanValidationSummary()

  const result =
    selectedEntry.access === "accessible"
      ? await withMarketCache({
          cacheKey: `starter-dataset:${selectedDefinition.id}:${toSortedQueryString(selectedQuery)}`,
          category: "dataset-explorer",
          ttlSeconds: selectedDefinition.ttlSeconds,
          fallback: null,
          staleOnError: true,
          fetcher: () =>
            fetchStarterDatasetResult(selectedDefinition, selectedQuery),
        })
      : null

  return {
    categorySummaries,
    result,
    selectedEntry,
    selectedQuery,
    validation,
  }
}
