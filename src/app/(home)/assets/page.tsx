import { AssetGroupPanel } from "@/components/markets/assets/asset-market-grid"
import {
  EmptyState,
  PageHeader,
} from "@/components/markets/ui/market-primitives"
import { getMultiAssetSnapshot } from "@/lib/server/markets/service"

export default async function AssetsPage() {
  const snapshot = await getMultiAssetSnapshot()

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Assets"
        title="Cross-asset starter coverage"
        description="Starter-validated crypto, forex, and commodity symbols grouped into one route so the non-equity tape lives alongside the existing equity workspace."
      />

      {snapshot.groups.length > 0 ? (
        snapshot.groups.map((group) => (
          <div id={group.id} key={group.id}>
            <AssetGroupPanel group={group} />
          </div>
        ))
      ) : (
        <div className="mt-5 px-4 sm:px-6">
          <EmptyState
            title="No multi-asset coverage yet"
            description="Validated Starter-accessible crypto, forex, and commodity groups will appear here once the market cache has a first successful fetch."
          />
        </div>
      )}
    </div>
  )
}
