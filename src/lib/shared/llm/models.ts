export const AvailableModels = {
  OPENROUTER_MINIMAX_M2_7: "minimax/minimax-m2.7",
  OPENROUTER_Z_AI_GLM_5: "z-ai/glm-5",
} as const

export type ModelType = (typeof AvailableModels)[keyof typeof AvailableModels]

export function isModelType(value: unknown): value is ModelType {
  return (
    typeof value === "string" &&
    Object.values(AvailableModels).includes(value as ModelType)
  )
}

export interface ModelListItem {
  id: string
  name: string
}

export interface ModelInfo extends ModelListItem {
  id: ModelType
}

export const OPENROUTER_MODELS = [
  AvailableModels.OPENROUTER_MINIMAX_M2_7,
  AvailableModels.OPENROUTER_Z_AI_GLM_5,
] as const

export const ALL_MODELS = [...OPENROUTER_MODELS] as const

export function resolveDefaultModel(
  models: readonly Pick<ModelInfo, "id">[]
): ModelType {
  return models[0]?.id ?? OPENROUTER_MODELS[0]
}

export function sanitizeModelInfos(
  models: readonly ModelListItem[]
): ModelInfo[] {
  return models.filter((model): model is ModelInfo => isModelType(model.id))
}

export function resolveModelName(
  modelId: string | null | undefined,
  availableModels: readonly ModelListItem[] = []
): string | null {
  if (!modelId) {
    return null
  }

  const availableModel = availableModels.find((model) => model.id === modelId)
  if (availableModel) {
    return availableModel.name
  }

  return isModelType(modelId) ? ModelInfos[modelId].name : modelId
}

export const ModelInfos: Record<ModelType, ModelInfo> = {
  [AvailableModels.OPENROUTER_MINIMAX_M2_7]: {
    id: AvailableModels.OPENROUTER_MINIMAX_M2_7,
    name: "MiniMax M2.7",
  },
  [AvailableModels.OPENROUTER_Z_AI_GLM_5]: {
    id: AvailableModels.OPENROUTER_Z_AI_GLM_5,
    name: "Z.AI GLM-5",
  },
}
