export function TickerOverviewBody({
  aside,
  children,
}: {
  aside: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="px-4 pt-6 sm:px-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-w-0 lg:col-span-2">{children}</div>
        <aside className="min-w-0">{aside}</aside>
      </div>
    </div>
  )
}
