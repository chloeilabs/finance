import {
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { formatDateTime } from "@/lib/markets-format"
import {
  getFmpPlanValidationSummary,
  getMarketPlanSummary,
} from "@/lib/server/markets/config"
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
  const validation = getFmpPlanValidationSummary()

  return (
    <div className="pb-10">
      <PageHeader title="Settings" />

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

      <SectionFrame title="Capability validation">
        {validation ? (
          <div className="space-y-4">
            <div className="market-grid-4 market-panel-grid grid text-xs">
              <div className="market-panel-tile px-3 py-2">
                <div className="text-muted-foreground">Last validated</div>
                <div className="mt-1 font-departureMono tracking-tight">
                  {formatDateTime(validation.validatedAt)}
                </div>
              </div>
              <div className="market-panel-tile px-3 py-2">
                <div className="text-muted-foreground">Accessible probes</div>
                <div className="mt-1 font-departureMono tracking-tight">
                  {validation.accessibleProbes.length}
                </div>
              </div>
              <div className="market-panel-tile px-3 py-2">
                <div className="text-muted-foreground">Restricted probes</div>
                <div className="mt-1 font-departureMono tracking-tight">
                  {validation.restrictedProbes.length}
                </div>
              </div>
              <div className="market-panel-tile px-3 py-2">
                <div className="text-muted-foreground">Snapshot source</div>
                <div className="mt-1 font-departureMono tracking-tight">
                  {validation.source}
                </div>
              </div>
            </div>

            <div className="market-grid-2 market-panel-grid grid text-xs">
              <div className="market-panel-tile px-3 py-2">
                <div className="text-muted-foreground">Validated access</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {validation.accessibleProbes.map((probe) => (
                    <span
                      key={probe}
                      className="border border-border/60 px-2 py-1 font-departureMono tracking-tight"
                    >
                      {probe}
                    </span>
                  ))}
                </div>
              </div>
              <div className="market-panel-tile px-3 py-2">
                <div className="text-muted-foreground">Still restricted</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {validation.restrictedProbes.map((probe) => (
                    <span
                      key={probe}
                      className="border border-border/60 px-2 py-1 font-departureMono tracking-tight"
                    >
                      {probe}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="market-panel-tile px-3 py-2 text-sm text-muted-foreground">
            No validation snapshot is stored for this plan. Run{" "}
            <code>pnpm markets:capabilities:write</code> to refresh live
            capabilities.
          </div>
        )}
      </SectionFrame>
    </div>
  )
}
