import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { Thread } from "@/lib/shared/threads"

interface MockThreadsContext {
  currentThreadId: string | null
  setCurrentThreadId: ReturnType<typeof vi.fn>
  threads: Thread[]
}

const mockUseThreads = vi.fn<() => MockThreadsContext>()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("@/components/agent/home/home-content", () => ({
  HomePageContent: () => <div>Copilot content</div>,
}))

vi.mock("@/components/agent/home/threads-context", () => ({
  useThreads: () => mockUseThreads(),
}))

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}))

import { MarketCopilotSidebar } from "../market-copilot-sidebar"

describe("MarketCopilotSidebar", () => {
  beforeEach(() => {
    mockUseThreads.mockReset()
  })

  it("hides new chat in the empty-state copilot rail", () => {
    mockUseThreads.mockReturnValue({
      currentThreadId: null,
      setCurrentThreadId: vi.fn(),
      threads: [
        {
          createdAt: "2026-04-01T00:00:00.000Z",
          id: "thread-1",
          messages: [],
          title: "Bull case",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
    })

    const html = renderToStaticMarkup(
      <MarketCopilotSidebar
        initialSelectedModel={null}
        onOpenChange={() => undefined}
        open
        resetToken={0}
        viewer={{
          email: "markets@example.test",
          id: "user_123",
          name: "Finance Tester",
        }}
      />
    )

    const historyIndex = html.indexOf("History")
    const openIndex = html.indexOf("Open")

    expect(html).toContain("Open")
    expect(html).not.toContain("New Chat")
    expect(html).toContain("History")
    expect(html).toContain("Copilot content")
    expect(historyIndex).toBeGreaterThan(-1)
    expect(openIndex).toBeGreaterThan(historyIndex)
  })

  it("shows new chat when the active copilot thread has messages", () => {
    mockUseThreads.mockReturnValue({
      currentThreadId: "thread-1",
      setCurrentThreadId: vi.fn(),
      threads: [
        {
          createdAt: "2026-04-01T00:00:00.000Z",
          id: "thread-1",
          messages: [
            {
              content: "What stands out in my portfolio?",
              createdAt: "2026-04-01T00:00:00.000Z",
              id: "msg-1",
              llmModel: "openai/gpt-5-mini",
              role: "user",
            },
          ],
          title: "Bull case",
          updatedAt: "2026-04-01T00:00:00.000Z",
        },
      ],
    })

    const html = renderToStaticMarkup(
      <MarketCopilotSidebar
        initialSelectedModel={null}
        onOpenChange={() => undefined}
        open
        resetToken={0}
        viewer={{
          email: "markets@example.test",
          id: "user_123",
          name: "Finance Tester",
        }}
      />
    )

    const historyIndex = html.indexOf("History")
    const newChatIndex = html.indexOf("New Chat")
    const openIndex = html.indexOf("Open")

    expect(html).toContain("Open")
    expect(html).toContain("New Chat")
    expect(html).toContain("History")
    expect(html).toContain("Copilot content")
    expect(historyIndex).toBeGreaterThan(newChatIndex)
    expect(openIndex).toBeGreaterThan(historyIndex)
  })

  it("renders a desktop resize handle capped at 40 percent", () => {
    mockUseThreads.mockReturnValue({
      currentThreadId: null,
      setCurrentThreadId: vi.fn(),
      threads: [],
    })

    const html = renderToStaticMarkup(
      <MarketCopilotSidebar
        initialSelectedModel={null}
        onOpenChange={() => undefined}
        open
        resetToken={0}
        viewer={{
          email: "markets@example.test",
          id: "user_123",
          name: "Finance Tester",
        }}
      />
    )

    expect(html).toContain('aria-label="Resize Copilot sidebar"')
    expect(html).toContain("max-width:40%")
    expect(html).toContain("width:352px")
  })
})
