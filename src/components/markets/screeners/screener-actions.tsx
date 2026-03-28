"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import type { ScreenerFilterState, WatchlistRecord } from "@/lib/shared"

export function SaveScreenerButton({
  filters,
}: {
  filters: ScreenerFilterState
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      disabled={isPending}
      size="sm"
      variant="outline"
      onClick={() => {
        const name = window.prompt("Name this screen")

        if (!name) {
          return
        }

        startTransition(async () => {
          const response = await fetch("/api/screeners", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, filters }),
          })

          if (!response.ok) {
            toast.error("Failed to save screener.")
            return
          }

          toast.success("Screener saved.")
          window.location.reload()
        })
      }}
    >
      Save Screen
    </Button>
  )
}

export function DeleteScreenerButton({
  screenerId,
}: {
  screenerId: string
}) {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      disabled={isPending}
      size="sm"
      variant="ghost"
      onClick={() => {
        startTransition(async () => {
          const response = await fetch(`/api/screeners/${screenerId}`, {
            method: "DELETE",
          })

          if (!response.ok) {
            toast.error("Failed to delete screener.")
            return
          }

          toast.success("Screener deleted.")
          window.location.reload()
        })
      }}
    >
      Delete
    </Button>
  )
}

export function AddResultsToWatchlistButton({
  symbols,
  watchlists,
}: {
  symbols: string[]
  watchlists: WatchlistRecord[]
}) {
  const [isPending, startTransition] = useTransition()
  const [watchlistId, setWatchlistId] = useState<string>(watchlists[0]?.id ?? "")

  if (watchlists.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <select
        className="border border-border/70 bg-background px-2 py-1 text-sm"
        value={watchlistId}
        onChange={(event) => {
          setWatchlistId(event.target.value)
        }}
      >
        {watchlists.map((watchlist) => (
          <option key={watchlist.id} value={watchlist.id}>
            {watchlist.name}
          </option>
        ))}
      </select>
      <Button
        disabled={isPending || symbols.length === 0 || watchlistId === ""}
        size="sm"
        variant="outline"
        onClick={() => {
          startTransition(async () => {
            const existing = await fetch(`/api/watchlists/${watchlistId}`, {
              method: "GET",
            })

            if (!existing.ok) {
              toast.error("Failed to load watchlist.")
              return
            }

            const payload = (await existing.json()) as {
              watchlist?: WatchlistRecord | null
            }
            const currentSymbols = payload.watchlist?.symbols ?? []
            const nextSymbols = [...new Set([...currentSymbols, ...symbols])]

            const response = await fetch(`/api/watchlists/${watchlistId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ symbols: nextSymbols }),
            })

            if (!response.ok) {
              toast.error("Failed to update watchlist.")
              return
            }

            toast.success("Added screener results to watchlist.")
          })
        }}
      >
        Add Results To Watchlist
      </Button>
    </div>
  )
}
