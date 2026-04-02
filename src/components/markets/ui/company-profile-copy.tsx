"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function CompanyProfileCopy({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="mt-3 max-w-3xl">
      <p
        className={cn(
          "text-sm leading-6 text-muted-foreground",
          expanded ? undefined : "line-clamp-4"
        )}
      >
        {text}
      </p>
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
        {expanded ? "Show less" : "Read full company profile"}
      </Button>
    </div>
  )
}
