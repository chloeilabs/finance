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

function getPortfolioTitle(viewerName: string, fallbackTitle: string) {
  const firstName = viewerName.trim().split(/\s+/)[0]

  if (!firstName) {
    return fallbackTitle
  }

  return `${firstName}'s Portfolio`
}

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
        <PageHeader
          title="Portfolio unavailable"
          titleClassName="font-departureMono text-base tracking-tight sm:text-lg"
        />
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
      <PageHeader
        title={getPortfolioTitle(viewer.name, data.portfolio.name)}
        titleClassName="font-departureMono text-base tracking-tight sm:text-lg"
      />

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
