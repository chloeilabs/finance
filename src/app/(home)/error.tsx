"use client"

import { useEffect } from "react"

import {
  EmptyState,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { Button } from "@/components/ui/button"

export default function MarketRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("Market route failed:", error)
  }, [error])

  return (
    <div className="pb-10">
      <PageHeader
        title="Market page unavailable"
        description="An unexpected error interrupted this view. Cached sections may still recover on retry."
      />

      <SectionFrame title="Recovery">
        <div className="space-y-4">
          <EmptyState
            title="This route could not finish rendering"
            description="Retry this page. If the problem persists, check the upstream market provider and storage configuration."
          />
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              reset()
            }}
          >
            Retry Page
          </Button>
        </div>
      </SectionFrame>
    </div>
  )
}
