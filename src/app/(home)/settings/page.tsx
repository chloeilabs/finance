import {
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { getMarketPlanSummary } from "@/lib/server/markets/config"
import type { FmpCoverageScope } from "@/lib/shared/markets/plan"

function formatCoverageScope(scope: FmpCoverageScope) {
  switch (scope) {
    case "us":
      return "US only"
    case "usUkCanada":
      return "US / UK / CA"
    case "global":
      return "Global"
  }
}

export default function SettingsPage() {
  const plan = getMarketPlanSummary()

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Workspace" title="Settings" />

      <SectionFrame title="Market data plan">
        <div className="market-grid-5 market-panel-grid grid text-xs">
          <div className="market-panel-tile px-3 py-2">
            <div className="text-muted-foreground">Tier</div>
            <div className="mt-1 font-departureMono tracking-tight">
              {plan.label}
            </div>
          </div>
          <div className="market-panel-tile px-3 py-2">
            <div className="text-muted-foreground">Coverage</div>
            <div className="mt-1 font-departureMono tracking-tight">
              {formatCoverageScope(plan.capabilities.coverageScope)}
            </div>
          </div>
          <div className="market-panel-tile px-3 py-2">
            <div className="text-muted-foreground">Freshness</div>
            <div className="mt-1 font-departureMono tracking-tight">
              {plan.quoteFreshnessLabel}
            </div>
          </div>
          <div className="market-panel-tile px-3 py-2">
            <div className="text-muted-foreground">Budget</div>
            <div className="mt-1 font-departureMono tracking-tight">
              {plan.requestBudgetLabel}
            </div>
          </div>
          <div className="market-panel-tile px-3 py-2">
            <div className="text-muted-foreground">Bandwidth</div>
            <div className="mt-1 font-departureMono tracking-tight">
              {plan.bandwidthLimitLabel}
            </div>
          </div>
        </div>
      </SectionFrame>
    </div>
  )
}
