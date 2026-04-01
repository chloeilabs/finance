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
        id: "qwen/qwen3.6-plus-preview:free",
        name: "Qwen 3.6 Plus Preview",
      },
      {
        id: "z-ai/glm-5",
        name: "Z.AI GLM-5",
      },
    ])
  })
})
