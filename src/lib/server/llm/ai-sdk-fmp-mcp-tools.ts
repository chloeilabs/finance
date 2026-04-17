import "server-only"

import { createMCPClient, type MCPClient } from "@ai-sdk/mcp"
import { type ToolExecutionOptions, type ToolSet } from "ai"

import { asRecord, asString } from "@/lib/cast"
import {
  getConfiguredFmpApiKey,
  getFmpBaseUrl,
} from "@/lib/server/markets/config"
import { recordMarketApiUsage } from "@/lib/server/markets/store"
import type { MessageSource, ToolName } from "@/lib/shared/agent/messages"

const FMP_MCP_TOOL_NAME = "fmp_mcp" as const
const FMP_PROVIDER_NAME = "fmp" as const
const FMP_MCP_LABEL_PREFIX = "FMP: " as const
const FMP_MCP_LABEL_MAX_LENGTH = 180

type AiSdkFmpMcpToolName = Extract<ToolName, typeof FMP_MCP_TOOL_NAME>
type AiSdkFmpMcpToolDefinition = ToolSet[string]

interface AiSdkFmpMcpToolCallMetadata {
  callId: string
  toolName: AiSdkFmpMcpToolName
  label: string
}

interface AiSdkFmpMcpToolResultMetadata {
  callId: string
  toolName: AiSdkFmpMcpToolName
  status: "success" | "error"
  sources: MessageSource[]
}

export interface AiSdkFmpMcpSession {
  tools: ToolSet
  toolNames: Set<string>
  close: () => Promise<void>
}

function createEmptySession(): AiSdkFmpMcpSession {
  return {
    tools: {},
    toolNames: new Set<string>(),
    close: () => Promise.resolve(),
  }
}

function buildFmpMcpUrl(apiKey: string): string {
  return `${getFmpBaseUrl()}/mcp?apikey=${encodeURIComponent(apiKey)}`
}

function normalizeToolHintValue(value: string): string | null {
  const normalized = value.replace(/\s+/g, " ").trim()
  if (!normalized) {
    return null
  }

  if (normalized.length <= 48) {
    return normalized
  }

  return `${normalized.slice(0, 45).trimEnd()}...`
}

function toStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .flatMap((entry) => {
      if (typeof entry === "string") {
        return [entry]
      }

      if (typeof entry === "number" || typeof entry === "boolean") {
        return [String(entry)]
      }

      return []
    })
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
}

function getPreferredHint(input: Record<string, unknown>): string | null {
  const plainValueKeys = [
    "symbol",
    "symbols",
    "ticker",
    "tickers",
    "query",
    "company",
    "companies",
    "index",
    "indices",
  ] as const

  for (const key of plainValueKeys) {
    const stringValue = normalizeToolHintValue(asString(input[key]) ?? "")
    if (stringValue) {
      return stringValue
    }

    const values = toStringList(input[key]).slice(0, 3)
    if (values.length > 0) {
      return normalizeToolHintValue(values.join(", "))
    }
  }

  const keyedValueKeys = [
    "exchange",
    "date",
    "from",
    "to",
    "period",
    "timeframe",
    "interval",
    "limit",
  ] as const

  for (const key of keyedValueKeys) {
    const value = input[key]
    if (typeof value !== "string" && typeof value !== "number") {
      continue
    }

    const normalized = normalizeToolHintValue(String(value))
    if (normalized) {
      return `${key}=${normalized}`
    }
  }

  for (const [key, value] of Object.entries(input)) {
    if (typeof value === "string" || typeof value === "number") {
      const normalized = normalizeToolHintValue(String(value))
      if (normalized) {
        return `${key}=${normalized}`
      }
    }
  }

  return null
}

function clampLabel(label: string): string {
  if (label.length <= FMP_MCP_LABEL_MAX_LENGTH) {
    return label
  }

  return `${label.slice(0, FMP_MCP_LABEL_MAX_LENGTH - 3).trimEnd()}...`
}

function createToolLabel(toolName: string, input: unknown): string {
  const inputRecord = asRecord(input)
  const hint = inputRecord ? getPreferredHint(inputRecord) : null
  const baseLabel = `${FMP_MCP_LABEL_PREFIX}${toolName}`

  if (!hint) {
    return baseLabel
  }

  return clampLabel(`${baseLabel} (${hint})`)
}

function isFmpMcpToolName(
  value: string | undefined,
  toolNames: ReadonlySet<string>
): boolean {
  return typeof value === "string" && toolNames.has(value)
}

function getToolResultStatus(output: unknown): "success" | "error" {
  const outputRecord = asRecord(output)

  if (outputRecord?.isError === true) {
    return "error"
  }

  return "success"
}

function wrapToolWithUsageTracking(
  toolDefinition: AiSdkFmpMcpToolDefinition
): AiSdkFmpMcpToolDefinition {
  const execute = toolDefinition.execute as (
    input: unknown,
    options: ToolExecutionOptions
  ) => Promise<unknown>

  return {
    ...toolDefinition,
    execute: async (input: unknown, options: ToolExecutionOptions) => {
      await recordMarketApiUsage(FMP_PROVIDER_NAME)
      return execute(input, options)
    },
  }
}

function wrapToolsWithUsageTracking(tools: ToolSet): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, toolDefinition]) => [
      name,
      wrapToolWithUsageTracking(toolDefinition),
    ])
  ) as ToolSet
}

async function closeClientQuietly(client: MCPClient | undefined): Promise<void> {
  await client?.close().catch(() => undefined)
}

export async function createAiSdkFmpMcpSession(): Promise<AiSdkFmpMcpSession> {
  const apiKey = getConfiguredFmpApiKey()
  if (!apiKey) {
    return createEmptySession()
  }

  let client: MCPClient | undefined

  try {
    client = await createMCPClient({
      transport: {
        type: "http",
        url: buildFmpMcpUrl(apiKey),
        redirect: "error",
      },
    })

    const discoveredTools = await client.tools()

    return {
      tools: wrapToolsWithUsageTracking(discoveredTools as ToolSet),
      toolNames: new Set(Object.keys(discoveredTools)),
      close: () => closeClientQuietly(client),
    }
  } catch (error) {
    console.warn("[agent:fmp-mcp] Failed to initialize FMP MCP tools:", error)
    await closeClientQuietly(client)
    return createEmptySession()
  }
}

export function getAiSdkFmpMcpToolCallMetadata(
  part:
    | {
        toolCallId: string
        toolName: string
        input: unknown
      }
    | undefined,
  toolNames: ReadonlySet<string>
): AiSdkFmpMcpToolCallMetadata | null {
  if (!part || !isFmpMcpToolName(part.toolName, toolNames)) {
    return null
  }

  return {
    callId: part.toolCallId,
    toolName: FMP_MCP_TOOL_NAME,
    label: createToolLabel(part.toolName, part.input),
  }
}

export function getAiSdkFmpMcpToolResultMetadata(
  part:
    | {
        toolCallId: string
        toolName: string
        output: unknown
      }
    | undefined,
  toolNames: ReadonlySet<string>
): AiSdkFmpMcpToolResultMetadata | null {
  if (!part || !isFmpMcpToolName(part.toolName, toolNames)) {
    return null
  }

  return {
    callId: part.toolCallId,
    toolName: FMP_MCP_TOOL_NAME,
    status: getToolResultStatus(part.output),
    sources: [],
  }
}

export function isAiSdkFmpMcpToolName(
  value: unknown,
  toolNames: ReadonlySet<string>
): value is string {
  return typeof value === "string" && toolNames.has(value)
}
