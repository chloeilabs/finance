export const AvailableModels = {
  OPENROUTER_NVIDIA_NEMOTRON_3_SUPER_FREE:
    "nvidia/nemotron-3-super-120b-a12b:free",
  OPENROUTER_MINIMAX_M2_7: "minimax/minimax-m2.7",
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
  AvailableModels.OPENROUTER_NVIDIA_NEMOTRON_3_SUPER_FREE,
] as const

export const ALL_MODELS = [...OPENROUTER_MODELS] as const

export function resolveDefaultModel(
  models: readonly Pick<ModelInfo, "id">[]
): ModelType {
  return models[0]?.id ?? OPENROUTER_MODELS[0]
}

export const ModelInfos: Record<ModelType, ModelInfo> = {
  [AvailableModels.OPENROUTER_NVIDIA_NEMOTRON_3_SUPER_FREE]: {
    id: AvailableModels.OPENROUTER_NVIDIA_NEMOTRON_3_SUPER_FREE,
    name: "NVIDIA Nemotron 3 Super",
  },
  [AvailableModels.OPENROUTER_MINIMAX_M2_7]: {
    id: AvailableModels.OPENROUTER_MINIMAX_M2_7,
    name: "MiniMax M2.7",
  },
}
