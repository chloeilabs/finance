import {
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { formatDateTime } from "@/lib/markets-format"
import {
  getFmpPlanValidationSummary,
  getMarketPlanSummary,
} from "@/lib/server/markets/config"
import { getStarterDatasetCategorySummaries } from "@/lib/server/markets/service"
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
  const datasetSummaries = getStarterDatasetCategorySummaries()
  const accessibleDatasetCount = datasetSummaries.reduce(
    (total, summary) => total + summary.accessible.length,
    0
  )
  const restrictedDatasetCount = datasetSummaries.reduce(
    (total, summary) => total + summary.restricted.length,
    0
  )
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
                <div className="text-muted-foreground">Accessible datasets</div>
                <div className="mt-1 font-departureMono tracking-tight">
                  {accessibleDatasetCount}
                </div>
              </div>
              <div className="market-panel-tile px-3 py-2">
                <div className="text-muted-foreground">Restricted datasets</div>
                <div className="mt-1 font-departureMono tracking-tight">
                  {restrictedDatasetCount}
                </div>
              </div>
              <div className="market-panel-tile px-3 py-2">
                <div className="text-muted-foreground">Snapshot source</div>
                <div className="mt-1 font-departureMono tracking-tight">
                  {validation.source}
                </div>
              </div>
            </div>

            <div className="market-grid-3 market-panel-grid grid text-xs">
              {datasetSummaries.map((summary) => (
                <div key={summary.category} className="market-panel-tile px-3 py-2">
                  <div className="text-muted-foreground">{summary.category}</div>
                  <div className="mt-1 font-departureMono tracking-tight">
                    {summary.accessible.length} open / {summary.restricted.length} locked
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {summary.accessible.map((entry) => (
                      <span
                        key={entry.definition.id}
                        className="border border-border/60 px-2 py-1 font-departureMono tracking-tight"
                      >
                        {entry.definition.id}
                      </span>
                    ))}
                    {summary.restricted.map((entry) => (
                      <span
                        key={entry.definition.id}
                        className="border border-dashed border-border/60 px-2 py-1 font-departureMono tracking-tight text-muted-foreground"
                      >
                        {entry.definition.id}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
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
