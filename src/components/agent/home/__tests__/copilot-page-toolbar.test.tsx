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

vi.mock("../thread-search-dialog", () => ({
  ThreadSearchDialog: () => null,
}))

vi.mock("../threads-context", () => ({
  useThreads: () => mockUseThreads(),
}))

import { CopilotPageToolbar } from "../copilot-page-toolbar"

describe("CopilotPageToolbar", () => {
  beforeEach(() => {
    mockUseThreads.mockReset()
  })

  it("hides new chat in the empty state while keeping history visible", () => {
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

    const html = renderToStaticMarkup(<CopilotPageToolbar />)

    expect(html).not.toContain("New Chat")
    expect(html).toContain("History")
  })

  it("shows new chat when an active conversation has messages", () => {
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

    const html = renderToStaticMarkup(<CopilotPageToolbar />)

    expect(html).toContain("New Chat")
    expect(html).toContain("History")
  })
})
