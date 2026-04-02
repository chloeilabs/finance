import { describe, expect, it } from "vitest"

import { FMP_PLAN_VALIDATION_SNAPSHOTS } from "@/lib/shared/markets/fmp-plan-validation.generated"
import {
  deriveStarterCapabilitiesFromDatasetIds,
  getStarterDatasetDefinitionMap,
  getStarterDatasetDefinitions,
  STARTER_DATASET_IDS,
} from "@/lib/shared/markets/starter-datasets"

describe("starter dataset catalog", () => {
  it("defines each dataset id exactly once", () => {
    const definitions = getStarterDatasetDefinitions()
    const ids = definitions.map((definition) => definition.id)

    expect(ids).toHaveLength(STARTER_DATASET_IDS.length)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("builds a complete definition map with probe params", () => {
    const definitions = getStarterDatasetDefinitions()
    const definitionMap = getStarterDatasetDefinitionMap()

    expect(definitionMap.size).toBe(definitions.length)

    for (const definition of definitions) {
      expect(definitionMap.get(definition.id)).toBeDefined()
      expect(definition.path.startsWith("/stable/")).toBe(true)
      expect(definition.probeParams).toBeDefined()
    }
  })

  it("keeps the coarse capability matrix derivable from dataset access", () => {
    const starterSnapshot = FMP_PLAN_VALIDATION_SNAPSHOTS.STARTER

    expect(starterSnapshot).toBeDefined()

    const derived = deriveStarterCapabilitiesFromDatasetIds(
      starterSnapshot?.accessibleDatasets ?? []
    )

    expect(derived).toMatchObject(starterSnapshot?.capabilities ?? {})
  })
})
