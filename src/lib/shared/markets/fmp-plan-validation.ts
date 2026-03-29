import type {
  FmpCapabilityKey,
  FmpCoverageScope,
  FmpIntradayInterval,
  FmpPlanTier,
} from "./plan"

export interface FmpPlanValidationSnapshot {
  accessibleProbes: string[]
  capabilities: Partial<Record<FmpCapabilityKey, boolean>>
  coverageScope?: FmpCoverageScope
  intradayIntervals?: FmpIntradayInterval[]
  restrictedProbes: string[]
  source: string
  validatedAt: string
}

export type FmpPlanValidationSnapshots = Partial<
  Record<FmpPlanTier, FmpPlanValidationSnapshot>
>
