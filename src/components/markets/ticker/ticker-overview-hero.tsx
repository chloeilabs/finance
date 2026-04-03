export function TickerOverviewHero({
  chart,
  summary,
}: {
  chart: React.ReactNode
  summary: React.ReactNode
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-12 lg:items-stretch">
      <div className="min-w-0 lg:col-span-6 [&>*]:h-full">{summary}</div>
      <div className="min-w-0 lg:col-span-6 [&>*]:h-full">{chart}</div>
    </div>
  )
}
