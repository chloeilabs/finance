"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

export interface TickerTabItem {
  exact?: boolean
  href: string
  label: string
}

export function TickerTabNav({ items }: { items: TickerTabItem[] }) {
  const pathname = usePathname()

  return (
    <div className="sticky top-0 z-20 border-b border-border/55 bg-background/95 backdrop-blur">
      <div className="px-4 sm:px-6">
        <nav aria-label="Ticker sections" className="overflow-x-auto">
          <div className="flex min-w-max items-center gap-5">
            {items.map((item) => {
              const isActive =
                pathname === item.href ||
                (!item.exact && pathname.startsWith(`${item.href}/`))

              return (
                <Link
                  key={item.href}
                  className={cn(
                    "border-b-2 px-0 py-3 text-sm transition-colors",
                    isActive
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                  href={item.href}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
