import { afterEach, describe, expect, it } from "vitest"

import { getModels } from "../api-keys"

describe("getModels", () => {
  const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY

  afterEach(() => {
    if (originalOpenRouterApiKey === undefined) {
      delete process.env.OPENROUTER_API_KEY
      return
    }

    process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey
  })

  it("returns every configured OpenRouter model in registry order", () => {
    process.env.OPENROUTER_API_KEY = "test-key"

    expect(getModels()).toEqual([
      {
        id: "minimax/minimax-m2.7",
        name: "MiniMax M2.7",
      },
      {
        id: "z-ai/glm-5",
        name: "Z.AI GLM-5",
      },
      {
        id: "google/gemini-3.1-pro-preview-customtools",
        name: "Gemini 3.1 Pro",
      },
    ])
  })
})
