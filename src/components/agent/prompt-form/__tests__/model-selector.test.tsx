import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/hooks/agent/use-models", () => ({
  useModels: () => ({
    data: [],
    status: "success" as const,
  }),
}))

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  PopoverTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}))

vi.mock("@/components/ui/tooltip", () => ({
  Tooltip: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipProvider: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipTrigger: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}))

import { ModelSelector } from "../model-selector"

describe("ModelSelector", () => {
  it("renders the keyboard shortcut inline in the tooltip content", () => {
    const html = renderToStaticMarkup(
      <ModelSelector selectedModel={null} handleSelectModel={() => undefined} />
    )

    expect(html).toContain("Model Selector")
    expect(html).toContain("⌘.")
  })
})
