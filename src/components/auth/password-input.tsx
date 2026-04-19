"use client"

import { type ComponentProps, useState } from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type PasswordInputProps = Omit<ComponentProps<typeof Input>, "type"> & {
  revealLabel?: string
}

export function PasswordInput({
  className,
  disabled,
  id,
  revealLabel = "password",
  ...props
}: PasswordInputProps) {
  const [isVisible, setIsVisible] = useState(false)
  const toggleLabel = `${isVisible ? "Hide" : "Show"} ${revealLabel}`

  return (
    <div className="relative">
      <Input
        {...props}
        id={id}
        disabled={disabled}
        type={isVisible ? "text" : "password"}
        className={cn("pr-14", className)}
      />
      <button
        type="button"
        disabled={disabled}
        aria-controls={id}
        aria-label={toggleLabel}
        aria-pressed={isVisible}
        className={cn(
          "group/button inline-flex shrink-0 cursor-pointer items-center justify-center rounded-none border border-transparent bg-clip-padding text-xs font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-1 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
          "absolute top-1/2 right-1 h-7 -translate-y-1/2 gap-1 px-2 text-[11px] text-muted-foreground hover:bg-transparent"
        )}
        onClick={() => {
          setIsVisible((currentValue) => !currentValue)
        }}
      >
        {isVisible ? "Hide" : "Show"}
      </button>
    </div>
  )
}
