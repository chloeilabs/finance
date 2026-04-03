"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CompanyProfileCopy({
  collapsible = true,
  text,
}: {
  collapsible?: boolean
  text: string
}) {
  const [expanded, setExpanded] = useState(false)
  const isExpanded = !collapsible || expanded

  return (
    <div className="mt-3 max-w-3xl">
      <p
        className={cn(
          "text-sm leading-6 text-muted-foreground",
          isExpanded ? undefined : "line-clamp-4"
        )}
      >
        {text}
      </p>
      {collapsible ? (
        <Button
          aria-expanded={expanded}
          className="mt-3"
          onClick={() => {
            setExpanded((current) => !current)
          }}
          size="sm"
          type="button"
          variant="outline"
        >
          {expanded ? "Show less" : "Show more"}
        </Button>
      ) : null}
    </div>
  )
}
