import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const { createMCPClient, recordMarketApiUsage } = vi.hoisted(() => ({
  createMCPClient: vi.fn(),
  recordMarketApiUsage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@ai-sdk/mcp", () => ({
  createMCPClient,
}))

vi.mock("@/lib/server/markets/store", () => ({
  recordMarketApiUsage,
}))

import {
  createAiSdkFmpMcpSession,
  getAiSdkFmpMcpToolCallMetadata,
  getAiSdkFmpMcpToolResultMetadata,
} from "../ai-sdk-fmp-mcp-tools"

describe("ai-sdk-fmp-mcp-tools", () => {
  const originalApiKey = process.env.FMP_API_KEY
  const originalBaseUrl = process.env.FMP_BASE_URL

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.FMP_BASE_URL = "https://example.test"
  })

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.FMP_API_KEY
    } else {
      process.env.FMP_API_KEY = originalApiKey
    }

    if (originalBaseUrl === undefined) {
      delete process.env.FMP_BASE_URL
    } else {
      process.env.FMP_BASE_URL = originalBaseUrl
    }
  })

  it("returns an empty session when FMP_API_KEY is missing", async () => {
    delete process.env.FMP_API_KEY

    const session = await createAiSdkFmpMcpSession()

    expect(createMCPClient).not.toHaveBeenCalled()
    expect(session.tools).toEqual({})
    expect([...session.toolNames]).toEqual([])
    await expect(session.close()).resolves.toBeUndefined()
  })

  it("returns an empty session when MCP initialization fails", async () => {
    process.env.FMP_API_KEY = "test-key"
    createMCPClient.mockRejectedValue(new Error("boom"))

    await expect(createAiSdkFmpMcpSession()).resolves.toMatchObject({
      tools: {},
    })
  })

  it("wraps discovered tools and records usage once per execution", async () => {
    process.env.FMP_API_KEY = "test-key"
    const execute = vi.fn().mockResolvedValue({
      content: [{ type: "text", text: "ok" }],
    })
    const close = vi.fn().mockResolvedValue(undefined)
    const tools = {
      quote: {
        description: "Quote",
        inputSchema: { type: "object" },
        execute,
      },
    }

    createMCPClient.mockResolvedValue({
      tools: vi.fn().mockResolvedValue(tools),
      close,
    })

    const session = await createAiSdkFmpMcpSession()
    await expect(
      session.tools.quote?.execute?.({ symbol: "AAPL" }, {} as never)
    ).resolves.toEqual({
      content: [{ type: "text", text: "ok" }],
    })

    expect(createMCPClient).toHaveBeenCalledWith({
      transport: {
        type: "http",
        url: "https://example.test/mcp?apikey=test-key",
        redirect: "error",
      },
    })
    expect(recordMarketApiUsage).toHaveBeenCalledWith("fmp")
    expect(execute).toHaveBeenCalledWith({ symbol: "AAPL" }, {})

    await session.close()
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("normalizes FMP tool call and result metadata", () => {
    const toolNames = new Set(["quote"])

    expect(
      getAiSdkFmpMcpToolCallMetadata(
        {
          toolCallId: "call-1",
          toolName: "quote",
          input: { symbol: "AAPL" },
        },
        toolNames
      )
    ).toEqual({
      callId: "call-1",
      toolName: "fmp_mcp",
      label: "FMP: quote (AAPL)",
    })

    expect(
      getAiSdkFmpMcpToolResultMetadata(
        {
          toolCallId: "call-1",
          toolName: "quote",
          output: { content: [], isError: true },
        },
        toolNames
      )
    ).toEqual({
      callId: "call-1",
      toolName: "fmp_mcp",
      status: "error",
      sources: [],
    })
  })
})
