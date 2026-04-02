import type {
  FmpCapabilityKey,
  FmpCoverageScope,
  FmpIntradayInterval,
  FmpPlanTier,
} from "./plan.ts"
import type { StarterDatasetId } from "./starter-datasets.ts"

export interface FmpPlanValidationSnapshot {
  accessibleDatasets: StarterDatasetId[]
  accessibleProbes: string[]
  capabilities: Partial<Record<FmpCapabilityKey, boolean>>
  coverageScope?: FmpCoverageScope
  intradayIntervals?: FmpIntradayInterval[]
  restrictedDatasets: StarterDatasetId[]
  restrictedProbes: string[]
  source: string
  validatedAt: string
}

export type FmpPlanValidationSnapshots = Partial<
  Record<FmpPlanTier, FmpPlanValidationSnapshot>
>
