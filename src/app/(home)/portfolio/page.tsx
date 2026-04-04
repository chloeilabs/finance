import { PortfolioAllocation } from "@/components/markets/portfolio/portfolio-allocation"
import { PortfolioHoldingsPanel } from "@/components/markets/portfolio/portfolio-holdings-panel"
import { PortfolioOverview } from "@/components/markets/portfolio/portfolio-overview"
import {
  EmptyState,
  PageHeader,
  SectionFrame,
  WarningStrip,
} from "@/components/markets/ui/market-primitives"
import { getCurrentViewer } from "@/lib/server/auth-session"
import { isMarketStoreNotInitializedError } from "@/lib/server/markets/errors"
import { getPortfolioPageData } from "@/lib/server/markets/service"

export default async function PortfolioPage() {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return null
  }

  let data: Awaited<ReturnType<typeof getPortfolioPageData>>

  try {
    data = await getPortfolioPageData(viewer.id)
  } catch (error) {
    if (!isMarketStoreNotInitializedError(error)) {
      throw error
    }

    return (
      <div className="pb-10">
        <PageHeader eyebrow="Portfolio" title="Portfolio unavailable" />
        <WarningStrip warnings={[error.message]} />
        <SectionFrame title="Storage">
          <EmptyState
            title="Portfolio storage is unavailable"
            description="Initialize the market tables and reload this page to restore portfolio tracking."
          />
        </SectionFrame>
      </div>
    )
  }

  return (
    <div className="pb-10">
      <PageHeader eyebrow="Portfolio" title={data.portfolio.name} />

      <SectionFrame title="Overview">
        <PortfolioOverview summary={data.summary} />
      </SectionFrame>

      <SectionFrame title="Holdings">
        <PortfolioHoldingsPanel holdings={data.holdings} portfolio={data.portfolio} />
      </SectionFrame>

      <SectionFrame title="Allocation">
        <PortfolioAllocation
          instrumentAllocations={data.instrumentAllocations}
          sectorAllocations={data.sectorAllocations}
        />
      </SectionFrame>
    </div>
  )
}
