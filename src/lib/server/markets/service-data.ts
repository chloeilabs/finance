import "server-only"

import {
  getStarterDatasetDefinitions,
  STARTER_DATASET_CATEGORIES,
  type StarterDatasetCategory,
  type StarterDatasetDefinition,
} from "@/lib/shared/markets/starter-datasets"

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
