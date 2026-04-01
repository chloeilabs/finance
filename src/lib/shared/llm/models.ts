export const AvailableModels = {
  OPENROUTER_QWEN_3_6_PLUS_PREVIEW_FREE:
    "qwen/qwen3.6-plus-preview:free",
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

export interface ModelInfo {
  id: ModelType
  name: string
}

export const OPENROUTER_MODELS = [
  AvailableModels.OPENROUTER_MINIMAX_M2_7,
  AvailableModels.OPENROUTER_QWEN_3_6_PLUS_PREVIEW_FREE,
  AvailableModels.OPENROUTER_Z_AI_GLM_5,
] as const

export const ALL_MODELS = [...OPENROUTER_MODELS] as const

export function resolveDefaultModel(
  models: readonly Pick<ModelInfo, "id">[]
): ModelType {
  return models[0]?.id ?? OPENROUTER_MODELS[0]
}

export const ModelInfos: Record<ModelType, ModelInfo> = {
  [AvailableModels.OPENROUTER_QWEN_3_6_PLUS_PREVIEW_FREE]: {
    id: AvailableModels.OPENROUTER_QWEN_3_6_PLUS_PREVIEW_FREE,
    name: "Qwen 3.6 Plus Preview",
  },
  [AvailableModels.OPENROUTER_MINIMAX_M2_7]: {
    id: AvailableModels.OPENROUTER_MINIMAX_M2_7,
    name: "MiniMax M2.7",
  },
  [AvailableModels.OPENROUTER_Z_AI_GLM_5]: {
    id: AvailableModels.OPENROUTER_Z_AI_GLM_5,
    name: "Z.AI GLM-5",
  },
}
