import { describe, expect, it } from "vitest"

import {
  AvailableModels,
  resolveModelName,
  sanitizeModelInfos,
} from "../models"

describe("sanitizeModelInfos", () => {
  it("filters unknown model ids out of API payloads", () => {
    expect(
      sanitizeModelInfos([
        {
          id: AvailableModels.OPENROUTER_MINIMAX_M2_7,
          name: "MiniMax M2.7",
        },
        {
          id: "qwen/qwen3.6-plus-preview:free",
          name: "Qwen 3.6 Plus Preview",
        },
      ])
    ).toEqual([
      {
        id: AvailableModels.OPENROUTER_MINIMAX_M2_7,
        name: "MiniMax M2.7",
      },
    ])
  })
})

describe("resolveModelName", () => {
  it("uses the available model payload name before falling back to the registry", () => {
    expect(
      resolveModelName("qwen/qwen3.6-plus-preview:free", [
        {
          id: "qwen/qwen3.6-plus-preview:free",
          name: "Qwen 3.6 Plus Preview",
        },
      ])
    ).toBe("Qwen 3.6 Plus Preview")
  })

  it("falls back to the shared registry for supported models", () => {
    expect(resolveModelName(AvailableModels.OPENROUTER_Z_AI_GLM_5)).toBe(
      "Z.AI GLM-5"
    )
  })
})
