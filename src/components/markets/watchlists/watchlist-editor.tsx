"use client"

import { Plus, RefreshCw, X } from "lucide-react"
import { useMemo, useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { WatchlistRecord } from "@/lib/shared"

export function WatchlistEditor({
  watchlist,
  watchlistLimit,
}: {
  watchlist: WatchlistRecord
  watchlistLimit: number
}) {
  const [isPending, startTransition] = useTransition()
  const [draft, setDraft] = useState("")
  const [symbols, setSymbols] = useState(watchlist.symbols)

  const normalizedDraft = useMemo(
    () =>
      draft
        .split(",")
        .map((value) => value.trim().toUpperCase())
        .filter(Boolean),
    [draft]
  )

  const syncWatchlist = (nextSymbols: string[]) => {
    startTransition(async () => {
      const response = await fetch(`/api/watchlists/${watchlist.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols: nextSymbols,
        }),
      })

      if (!response.ok) {
        toast.error("Failed to update watchlist.")
        return
      }

      const payload = (await response.json()) as { watchlist?: WatchlistRecord }
      setSymbols(payload.watchlist?.symbols ?? nextSymbols)
      toast.success("Watchlist updated.")
    })
  }

  const refreshQuotes = () => {
    startTransition(async () => {
      const response = await fetch(`/api/watchlists/${watchlist.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          symbols,
          refresh: true,
        }),
      })

      if (!response.ok) {
        toast.error("Failed to refresh quotes.")
        return
      }

      toast.success("Quote cache refreshed.")
      window.location.reload()
    })
  }

  return (
    <div className="space-y-3 border border-border/70 px-4 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="font-departureMono text-sm tracking-tight">
            {watchlist.name}
          </div>
          <div className="text-xs text-muted-foreground">
            {symbols.length} / {watchlistLimit} symbols
          </div>
        </div>
        <Button
          disabled={isPending}
          size="sm"
          variant="outline"
          onClick={refreshQuotes}
        >
          <RefreshCw className="size-3.5" />
          Refresh quotes
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {symbols.map((symbol) => (
          <button
            key={symbol}
            className="inline-flex items-center gap-2 border border-border/70 px-2 py-1 text-xs transition-colors hover:bg-muted/35"
            type="button"
            onClick={() =>
              { syncWatchlist(symbols.filter((item) => item !== symbol)); }
            }
          >
            <span className="font-departureMono tracking-tight">{symbol}</span>
            <X className="size-3" />
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          className="rounded-none border-border/70"
          placeholder="Add symbols, comma separated"
          value={draft}
          onChange={(event) => { setDraft(event.target.value); }}
        />
        <Button
          disabled={
            isPending ||
            normalizedDraft.length === 0 ||
            symbols.length + normalizedDraft.length > watchlistLimit
          }
          onClick={() => {
            const nextSymbols = [...new Set([...symbols, ...normalizedDraft])]
            setDraft("")
            syncWatchlist(nextSymbols)
          }}
        >
          <Plus className="size-3.5" />
          Add Symbols
        </Button>
      </div>
    </div>
  )
}
