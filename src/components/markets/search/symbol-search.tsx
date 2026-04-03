"use client"

import { Search } from "lucide-react"
import Link from "next/link"
import { useDeferredValue, useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import type { MarketSearchResult } from "@/lib/shared/markets/core"
import { getTickerHref } from "@/lib/shared/markets/ticker-routes"
import { cn } from "@/lib/utils"

export function SymbolSearch({
  className,
  inputClassName,
}: {
  className?: string
  inputClassName?: string
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<MarketSearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const deferredQuery = useDeferredValue(query)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const current = rootRef.current

    if (!current) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    window.addEventListener("pointerdown", handlePointerDown)
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown)
    }
  }, [])

  useEffect(() => {
    const normalizedQuery = deferredQuery.trim()

    if (normalizedQuery.length < 2) {
      return
    }

    let cancelled = false

    fetch(`/api/market/search?q=${encodeURIComponent(normalizedQuery)}`, {
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch search results.")
        }

        return (await response.json()) as { results?: MarketSearchResult[] }
      })
      .then((payload) => {
        if (!cancelled) {
          setResults(payload.results ?? [])
          setIsOpen(true)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResults([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [deferredQuery])

  return (
    <div ref={rootRef} className={cn("relative w-full max-w-md", className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Search stocks"
          className={cn(
            "h-9 rounded-none border-border/70 bg-background pl-8",
            inputClassName
          )}
          placeholder="Search symbols, companies, ETFs"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setIsOpen(true)
          }}
          onFocus={() => {
            if (results.length > 0) {
              setIsOpen(true)
            }
          }}
        />
      </div>

      {isOpen && deferredQuery.trim().length >= 2 && results.length > 0 ? (
        <div className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-40 border border-border/70 bg-background shadow-lg">
          {results.map((result) => (
            <Link
              key={`${result.symbol}:${result.exchangeShortName ?? ""}`}
              className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border/40 px-3 py-2 text-sm transition-colors last:border-b-0 hover:bg-muted/35"
              href={getTickerHref(
                result.symbol,
                result.instrumentKind ??
                  (/etf|fund/i.test(result.type ?? "") ? "etf" : "stock")
              )}
              onClick={() => {
                setIsOpen(false)
                setQuery("")
              }}
            >
              <div className="font-departureMono text-xs tracking-tight">
                {result.symbol}
              </div>
              <div className="min-w-0 truncate text-muted-foreground">
                {result.name}
              </div>
              <div className="text-[11px] tracking-[0.14em] text-muted-foreground uppercase">
                {result.exchangeShortName ?? result.type ?? "asset"}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
