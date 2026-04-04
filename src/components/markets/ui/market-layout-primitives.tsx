import { cn } from "@/lib/utils"

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  titleClassName,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
  titleClassName?: string
}) {
  return (
    <header className="px-4 pt-4 pb-1 sm:px-6 sm:pt-5">
      <div className="market-page-header-layout">
        <div className="min-w-0 space-y-1.5">
          {eyebrow ? (
            <div className="font-departureMono text-[10px] tracking-[0.24em] text-muted-foreground uppercase">
              {eyebrow}
            </div>
          ) : null}
          <div className="space-y-1">
            <h1
              className={cn(
                titleClassName ?? "text-2xl tracking-tight sm:text-3xl"
              )}
            >
              {title}
            </h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="market-page-header-actions">{actions}</div>
        ) : null}
      </div>
    </header>
  )
}

export function SectionFrame({
  title,
  description,
  aside,
  children,
  className,
}: {
  title: string
  description?: string
  aside?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <section className={cn("mt-5 px-4 sm:px-6", className)}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="font-departureMono text-sm tracking-tight">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {aside ? (
            <div className="text-xs text-muted-foreground">{aside}</div>
          ) : null}
        </div>
        {children}
      </div>
    </section>
  )
}

export function WarningStrip({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return null
  }

  return (
    <div className="bg-[color:var(--vesper-orange)]/8 px-4 py-1.5 text-xs leading-5 text-foreground/80 sm:px-6">
      {warnings.join(" ")}
    </div>
  )
}

export function EmptyState({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div className="market-soft-surface px-4 py-6 text-sm text-muted-foreground">
      <div className="font-medium text-foreground">{title}</div>
      <p className="mt-1 max-w-2xl leading-6">{description}</p>
    </div>
  )
}
