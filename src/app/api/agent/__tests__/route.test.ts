import { NextRequest } from "next/server"
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest"

const mockedDependencies = vi.hoisted(() => ({
  buildAgentPromptContract: vi.fn(),
  createAgentTextStream: vi.fn(),
  getRequestSession: vi.fn(),
}))

const MODEL_ID = "minimax/minimax-m2.7"

vi.mock("@/lib/actions/api-keys", () => ({
  getModels: vi.fn(() => [{ id: MODEL_ID, name: "MiniMax M2.7" }]),
}))

vi.mock("@/lib/server/agent-context", () => ({
  buildAgentPromptContract: mockedDependencies.buildAgentPromptContract,
}))

vi.mock("@/lib/server/agent-prompt-steering", () => ({
  inferPromptOverlays: vi.fn(() => []),
  resolvePromptProvider: vi.fn(() => "openrouter"),
}))

vi.mock("@/lib/server/agent-runtime-config", () => ({
  AGENT_MAX_MESSAGE_CHARS: 16_000,
  AGENT_MAX_MESSAGES: 100,
  AGENT_MAX_CONCURRENT_REQUESTS_PER_CLIENT: 2,
  AGENT_RATE_LIMIT_ENABLED: false,
  AGENT_RATE_LIMIT_MAX_REQUESTS: 20,
  AGENT_MAX_TOTAL_CHARS: 200_000,
  AGENT_RATE_LIMIT_WINDOW_MS: 60_000,
  AGENT_STREAM_TIMEOUT_MS: 30_000,
}))

vi.mock("@/lib/server/auth", () => ({
  createAuthUnavailableResponse: vi.fn(
    (headers?: HeadersInit) =>
      new Response(JSON.stringify({ error: "Auth unavailable." }), {
        status: 503,
        headers,
      })
  ),
  isAuthConfigured: vi.fn(() => true),
}))

vi.mock("@/lib/server/auth-session", () => ({
  getRequestSession: mockedDependencies.getRequestSession,
}))

vi.mock("@/lib/server/rate-limit", () => ({
  evaluateAndConsumeSlidingWindowRateLimit: vi.fn(() => null),
  tryAcquireConcurrencySlot: vi.fn(() => null),
}))

vi.mock("@/lib/server/threads", () => ({
  isThreadStoreNotInitializedError: vi.fn(() => false),
}))

vi.mock("../route-stream", () => ({
  createAgentTextStream: mockedDependencies.createAgentTextStream,
}))

import { POST } from "../route"

function createRequest() {
  return new NextRequest("https://example.test/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-User-Timezone": "America/Chicago",
    },
    body: JSON.stringify({
      model: MODEL_ID,
      messages: [
        {
          role: "user",
          content: "How does my portfolio look right now?",
        },
      ],
    }),
  })
}

describe("POST /api/agent", () => {
  const originalOpenRouterApiKey = process.env.OPENROUTER_API_KEY
  let consoleWarnSpy: MockInstance<typeof console.warn>

  beforeEach(() => {
    vi.clearAllMocks()
    process.env.OPENROUTER_API_KEY = "test-openrouter-key"
    mockedDependencies.getRequestSession.mockResolvedValue({
      user: {
        email: "finance@example.com",
        id: "user_123",
        name: "Finance User",
      },
    })
    mockedDependencies.createAgentTextStream.mockReturnValue(
      new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close()
        },
      })
    )
    consoleWarnSpy = vi.spyOn(console, "warn")
    consoleWarnSpy.mockImplementation(() => undefined)
  })

  afterEach(() => {
    process.env.OPENROUTER_API_KEY = originalOpenRouterApiKey
    consoleWarnSpy.mockRestore()
  })

  it.each([
    ["ready", 0],
    ["empty", 0],
    ["unavailable", 1],
  ] as const)(
    "continues streaming when portfolio context is %s",
    async (status, expectedWarnCount) => {
      mockedDependencies.buildAgentPromptContract.mockResolvedValue({
        portfolioContextStatus: status,
        preludeMessages: [
          {
            role: "system",
            content: `portfolio status ${status}`,
          },
        ],
        systemInstruction: "stable instruction",
      })

      const response = await POST(createRequest())

      expect(response.status).toBe(200)
      expect(response.headers.get("Content-Type")).toContain(
        "application/x-ndjson"
      )
      expect(mockedDependencies.buildAgentPromptContract).toHaveBeenCalledTimes(
        1
      )
      expect(mockedDependencies.createAgentTextStream).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [
            {
              role: "system",
              content: `portfolio status ${status}`,
            },
            {
              role: "user",
              content: "How does my portfolio look right now?",
            },
          ],
          systemInstruction: "stable instruction",
        })
      )
      expect(consoleWarnSpy).toHaveBeenCalledTimes(expectedWarnCount)
    }
  )
})
