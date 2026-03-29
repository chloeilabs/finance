"use client"

import { Button } from "@/components/ui/button"
import { useModels } from "@/hooks/agent/use-models"
import { usePersistentSelectedModel } from "@/hooks/agent/use-persistent-selected-model"
import type { ModelType } from "@/lib/shared/llm/models"

export function HomePromptSuggestions({
  initialSelectedModel,
  onSelectSuggestion,
  suggestions,
}: {
  initialSelectedModel?: ModelType | null
  onSelectSuggestion: (message: string, model: ModelType) => void
  suggestions: readonly string[]
}) {
  const { data: availableModels = [] } = useModels()
  const { selectedModel } = usePersistentSelectedModel(
    initialSelectedModel ?? null,
    availableModels
  )

  return (
    <div className="market-soft-surface w-full p-3">
      <div className="mb-3">
        <div className="font-departureMono text-sm tracking-tight text-foreground">
          Start with one of these.
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {suggestions.map((suggestion) => (
          <Button
            key={suggestion}
            type="button"
            variant="ghost"
            disabled={!selectedModel}
            className="h-auto w-full justify-start px-3 py-2 text-left text-sm font-normal whitespace-normal text-foreground hover:bg-muted/70"
            onClick={() => {
              if (!selectedModel) {
                return
              }

              onSelectSuggestion(suggestion, selectedModel)
            }}
          >
            {suggestion}
          </Button>
        ))}
      </div>
    </div>
  )
}
