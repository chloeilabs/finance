import { type AuthViewer } from "@/lib/shared/auth"
import {
  DEFAULT_OPERATING_INSTRUCTION,
  DEFAULT_SOUL_FALLBACK_INSTRUCTION,
} from "@/lib/shared/llm/system-instructions"

import {
  createPromptSteeringBlocks,
  type PromptOverlay,
  type PromptProvider,
} from "./agent-prompt-steering"
import {
  type AgentPortfolioPromptContextStatus,
  formatAgentPortfolioPromptContext,
  getAgentPortfolioPromptContext,
} from "./markets/service-portfolio-context"

interface RuntimePromptContext {
  now: Date
  userTimeZone?: string
  provider?: PromptProvider
  overlays?: readonly PromptOverlay[]
}

interface AgentContextOverrides {
  operatingInstruction?: string
  providerOverlaysEnabled?: boolean
  overlayBlocksEnabled?: boolean
}

export interface AgentPromptPreludeMessage {
  role: "system"
  content: string
}

export interface AgentPromptContract {
  portfolioContextStatus: AgentPortfolioPromptContextStatus
  systemInstruction: string
  preludeMessages: AgentPromptPreludeMessage[]
}

function formatPromptBlock(label: string, body: string): string {
  return [`--- BEGIN ${label} ---`, body.trim(), `--- END ${label} ---`].join(
    "\n"
  )
}

function formatAuthUserContext(viewer: AuthViewer): string {
  const name = viewer.name.trim() || "(not provided)"

  return [
    "# Runtime Auth User Context",
    "",
    "This section is generated from the authenticated session for the current request.",
    "",
    `- Authenticated user display name: ${name}`,
  ].join("\n")
}

function normalizeTimeZone(value: string | undefined): string | undefined {
  const candidate = value?.trim()
  if (!candidate) {
    return undefined
  }

  try {
    new Intl.DateTimeFormat("en-US", {
      dateStyle: "full",
      timeStyle: "long",
      timeZone: candidate,
    }).format(new Date())
    return candidate
  } catch {
    return undefined
  }
}

function formatZonedDateTime(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "long",
    timeZone,
  }).format(date)
}

function formatRuntimeDateContext(context: RuntimePromptContext): string {
  const userTimeZone = normalizeTimeZone(context.userTimeZone)

  return [
    "# Runtime Date Context",
    "",
    "This section is generated for the current request and is authoritative for interpreting recency.",
    "",
    `- Current UTC timestamp: ${context.now.toISOString()}`,
    ...(userTimeZone
      ? [
          `- User time zone: ${userTimeZone}`,
          `- Current user-local time: ${formatZonedDateTime(context.now, userTimeZone)}`,
        ]
      : []),
    "- Treat the current date/time above as authoritative for words like today, tomorrow, yesterday, latest, recent, this week, and this month.",
    "- Unless the user explicitly asks about a past period, do not rewrite current-information requests into older years or months.",
    "- When searching for current information, keep queries aligned with the current date context first and then narrow from evidence.",
    "- When the user seems mistaken about dates, correct them with explicit calendar dates.",
  ].join("\n")
}

function composeSystemInstruction(params: {
  operatingInstruction?: string
  providerOverlaysEnabled?: boolean
  overlayBlocksEnabled?: boolean
  provider?: PromptProvider
  overlays?: readonly PromptOverlay[]
}): string {
  const blocks = [
    formatPromptBlock(
      "OPERATING INSTRUCTIONS",
      params.operatingInstruction ?? DEFAULT_OPERATING_INSTRUCTION
    ),
  ]

  const promptSteeringBlocks = createPromptSteeringBlocks({
    provider: params.provider,
    overlays: params.overlays,
    providerOverlaysEnabled: params.providerOverlaysEnabled,
    overlayBlocksEnabled: params.overlayBlocksEnabled,
  })

  for (const block of promptSteeringBlocks) {
    blocks.push(formatPromptBlock(block.label, block.body))
  }

  blocks.push(
    formatPromptBlock(
      "SHARED CONTEXT FILE: SOUL.md",
      DEFAULT_SOUL_FALLBACK_INSTRUCTION
    )
  )

  return blocks.join("\n\n")
}

async function createPreludeMessages(params: {
  viewer: AuthViewer
  authUserContext: string
  runtimeContext: RuntimePromptContext
}): Promise<{
  portfolioContextStatus: AgentPortfolioPromptContextStatus
  preludeMessages: AgentPromptPreludeMessage[]
}> {
  const portfolioContext = await getAgentPortfolioPromptContext({
    userId: params.viewer.id,
    now: params.runtimeContext.now,
  })

  return {
    portfolioContextStatus: portfolioContext.status,
    preludeMessages: [
      {
        role: "system",
        content: formatPromptBlock(
          "RUNTIME DATE CONTEXT",
          formatRuntimeDateContext(params.runtimeContext)
        ),
      },
      {
        role: "system",
        content: formatPromptBlock("AUTH USER CONTEXT", params.authUserContext),
      },
      {
        role: "system",
        content: formatPromptBlock(
          "PORTFOLIO CONTEXT",
          formatAgentPortfolioPromptContext(portfolioContext)
        ),
      },
    ],
  }
}

export async function buildAgentPromptContract(
  viewer: AuthViewer,
  runtimeContext: RuntimePromptContext,
  overrides: AgentContextOverrides = {}
): Promise<AgentPromptContract> {
  const authUserContext = formatAuthUserContext(viewer)
  const prelude = await createPreludeMessages({
    viewer,
    authUserContext,
    runtimeContext,
  })

  return {
    portfolioContextStatus: prelude.portfolioContextStatus,
    systemInstruction: composeSystemInstruction({
      operatingInstruction: overrides.operatingInstruction,
      providerOverlaysEnabled: overrides.providerOverlaysEnabled,
      overlayBlocksEnabled: overrides.overlayBlocksEnabled,
      provider: runtimeContext.provider,
      overlays: runtimeContext.overlays,
    }),
    preludeMessages: prelude.preludeMessages,
  }
}
