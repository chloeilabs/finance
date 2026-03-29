import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  streamText,
  stepCountIs,
  createOpenRouter,
  createAiSdkCodeExecutionTools,
  getAiSdkCodeExecutionToolCallMetadata,
  getAiSdkCodeExecutionToolResultMetadata,
  isAiSdkCodeExecutionToolName,
  createAiSdkTavilyTools,
  getAiSdkTavilyToolCallMetadata,
  getAiSdkTavilyToolResultMetadata,
  isAiSdkTavilyToolName,
  createAiSdkFmpMcpSession,
  getAiSdkFmpMcpToolCallMetadata,
  getAiSdkFmpMcpToolResultMetadata,
  isAiSdkFmpMcpToolName,
  getFmpPlanTier,
} = vi.hoisted(() => {
  const streamText = vi.fn()
  const stepCountIs = vi.fn((count: number) => count)
  const chat = vi.fn((model: string) => ({ model }))
  const createOpenRouter = vi.fn(() => ({ chat }))
  const createAiSdkCodeExecutionTools = vi.fn(() => ({
    code_execution: {
      execute: vi.fn(),
    },
  }))
  const getAiSdkCodeExecutionToolCallMetadata = vi.fn(() => null)
  const getAiSdkCodeExecutionToolResultMetadata = vi.fn(() => null)
  const isAiSdkCodeExecutionToolName = vi.fn(() => false)
  const createAiSdkTavilyTools = vi.fn(() => ({}))
  const getAiSdkTavilyToolCallMetadata = vi.fn(() => null)
  const getAiSdkTavilyToolResultMetadata = vi.fn(() => null)
  const isAiSdkTavilyToolName = vi.fn(() => false)
  const createAiSdkFmpMcpSession = vi.fn()
  const getAiSdkFmpMcpToolCallMetadata = vi.fn()
  const getAiSdkFmpMcpToolResultMetadata = vi.fn()
  const isAiSdkFmpMcpToolName = vi.fn()
  const getFmpPlanTier = vi.fn(() => "STARTER")

  return {
    streamText,
    stepCountIs,
    createOpenRouter,
    createAiSdkCodeExecutionTools,
    getAiSdkCodeExecutionToolCallMetadata,
    getAiSdkCodeExecutionToolResultMetadata,
    isAiSdkCodeExecutionToolName,
    createAiSdkTavilyTools,
    getAiSdkTavilyToolCallMetadata,
    getAiSdkTavilyToolResultMetadata,
    isAiSdkTavilyToolName,
    createAiSdkFmpMcpSession,
    getAiSdkFmpMcpToolCallMetadata,
    getAiSdkFmpMcpToolResultMetadata,
    isAiSdkFmpMcpToolName,
    getFmpPlanTier,
  }
})

vi.mock("ai", () => ({
  stepCountIs,
  streamText,
}))

vi.mock("@openrouter/ai-sdk-provider", () => ({
  createOpenRouter,
}))

vi.mock("../code-execution-tools", () => ({
  createAiSdkCodeExecutionTools,
  getAiSdkCodeExecutionToolCallMetadata,
  getAiSdkCodeExecutionToolResultMetadata,
  isAiSdkCodeExecutionToolName,
}))

vi.mock("../ai-sdk-tavily-tools", () => ({
  createAiSdkTavilyTools,
  getAiSdkTavilyToolCallMetadata,
  getAiSdkTavilyToolResultMetadata,
  isAiSdkTavilyToolName,
}))

vi.mock("../ai-sdk-fmp-mcp-tools", () => ({
  createAiSdkFmpMcpSession,
  getAiSdkFmpMcpToolCallMetadata,
  getAiSdkFmpMcpToolResultMetadata,
  isAiSdkFmpMcpToolName,
}))

vi.mock("@/lib/server/markets/config", () => ({
  getFmpPlanTier,
}))

import { startOpenRouterResponseStream } from "../openrouter-responses"

async function collectStream(
  generator: AsyncGenerator
): Promise<unknown[]> {
  const events: unknown[] = []

  for await (const event of generator) {
    events.push(event)
  }

  return events
}

describe("startOpenRouterResponseStream", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAiSdkFmpMcpToolCallMetadata.mockImplementation(
      (
        part:
          | {
              toolName: string
              toolCallId: string
            }
          | undefined
      ) => {
        if (part?.toolName !== "quote") {
          return null
        }

        return {
          callId: part.toolCallId,
          toolName: "fmp_mcp",
          label: "FMP: quote (AAPL)",
        }
      }
    )
    getAiSdkFmpMcpToolResultMetadata.mockImplementation(
      (
        part:
          | {
              toolName: string
              toolCallId: string
            }
          | undefined
      ) => {
        if (part?.toolName !== "quote") {
          return null
        }

        return {
          callId: part.toolCallId,
          toolName: "fmp_mcp",
          status: "success",
          sources: [],
        }
      }
    )
    isAiSdkFmpMcpToolName.mockImplementation((toolName) => toolName === "quote")
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it("normalizes FMP MCP tool events and closes the MCP session on success", async () => {
    const close = vi.fn().mockResolvedValue(undefined)

    createAiSdkFmpMcpSession.mockResolvedValue({
      tools: {
        quote: {
          execute: vi.fn(),
        },
      },
      toolNames: new Set(["quote"]),
      close,
    })

    streamText.mockReturnValue({
      fullStream: (async function* () {
        await Promise.resolve()
        yield {
          type: "tool-call",
          toolCallId: "call-1",
          toolName: "quote",
          input: { symbol: "AAPL" },
        }
        yield {
          type: "tool-result",
          toolCallId: "call-1",
          toolName: "quote",
          output: { content: [], isError: false },
          preliminary: false,
        }
        yield {
          type: "text-delta",
          text: "done",
        }
      })(),
    })

    const events = await collectStream(
      startOpenRouterResponseStream({
        model: "minimax/minimax-m2.7",
        openRouterApiKey: "or-key",
        messages: [{ role: "user", content: "price AAPL" }],
        systemInstruction: "base instruction",
      })
    )

    expect(events).toEqual([
      {
        type: "tool_call",
        callId: "call-1",
        toolName: "fmp_mcp",
        label: "FMP: quote (AAPL)",
      },
      {
        type: "tool_result",
        callId: "call-1",
        status: "success",
      },
      {
        type: "text_delta",
        delta: "done",
      },
    ])
    const streamTextArguments = streamText.mock.calls[0]?.[0] as
      | {
          tools: Record<string, unknown>
          system: string
        }
      | undefined

    expect(streamTextArguments?.tools.code_execution).toBeDefined()
    expect(streamTextArguments?.tools.quote).toBeDefined()
    expect(streamTextArguments?.system).toContain("FMP MCP tools are available")
    expect(close).toHaveBeenCalledTimes(1)
  })

  it("does not break local tools when FMP MCP is unavailable", async () => {
    createAiSdkFmpMcpSession.mockResolvedValue({
      tools: {},
      toolNames: new Set(),
      close: vi.fn().mockResolvedValue(undefined),
    })

    streamText.mockReturnValue({
      fullStream: (async function* () {
        await Promise.resolve()
        yield {
          type: "text-delta",
          text: "ok",
        }
      })(),
    })

    const events = await collectStream(
      startOpenRouterResponseStream({
        model: "minimax/minimax-m2.7",
        openRouterApiKey: "or-key",
        messages: [{ role: "user", content: "hello" }],
        systemInstruction: "base instruction",
      })
    )

    expect(events).toEqual([{ type: "text_delta", delta: "ok" }])
    const streamTextArguments = streamText.mock.calls[0]?.[0] as
      | {
          tools: Record<string, unknown>
          system: string
        }
      | undefined

    expect(streamTextArguments?.tools.code_execution).toBeDefined()
    expect(streamTextArguments?.system).toBe("base instruction")
  })

  it("closes the MCP session when streaming aborts", async () => {
    const close = vi.fn().mockResolvedValue(undefined)

    createAiSdkFmpMcpSession.mockResolvedValue({
      tools: {},
      toolNames: new Set(),
      close,
    })

    streamText.mockReturnValue({
      fullStream: (async function* () {
        await Promise.resolve()
        throw new DOMException("Timed out", "AbortError")
      })(),
    })

    await expect(
      collectStream(
        startOpenRouterResponseStream({
          model: "minimax/minimax-m2.7",
          openRouterApiKey: "or-key",
          messages: [{ role: "user", content: "hello" }],
          systemInstruction: "base instruction",
        })
      )
    ).rejects.toThrow("Timed out")

    expect(close).toHaveBeenCalledTimes(1)
  })

  it("closes the MCP session when streamText throws", async () => {
    const close = vi.fn().mockResolvedValue(undefined)

    createAiSdkFmpMcpSession.mockResolvedValue({
      tools: {},
      toolNames: new Set(),
      close,
    })

    streamText.mockImplementation(() => {
      throw new Error("boom")
    })

    await expect(
      collectStream(
        startOpenRouterResponseStream({
          model: "minimax/minimax-m2.7",
          openRouterApiKey: "or-key",
          messages: [{ role: "user", content: "hello" }],
          systemInstruction: "base instruction",
        })
      )
    ).rejects.toThrow("boom")

    expect(close).toHaveBeenCalledTimes(1)
  })
})
