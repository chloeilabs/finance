import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { ThreadsProvider } from "@/components/agent/home/threads-context"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

vi.mock("@/components/agent/home/home-content", () => ({
  HomePageContent: () => <div>Copilot content</div>,
}))

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}))

import { MarketCopilotSidebar } from "../market-copilot-sidebar"

describe("MarketCopilotSidebar", () => {
  it("renders the history action in the desktop copilot header", () => {
    const html = renderToStaticMarkup(
      <ThreadsProvider
        initialThreads={[
          {
            createdAt: "2026-04-01T00:00:00.000Z",
            id: "thread-1",
            messages: [],
            title: "Bull case",
            updatedAt: "2026-04-01T00:00:00.000Z",
          },
        ]}
      >
        <MarketCopilotSidebar
          initialSelectedModel={null}
          onOpenChange={() => undefined}
          open
          resetToken={0}
          viewer={{
            email: "markets@example.test",
            id: "user_123",
            name: "Markets Tester",
          }}
        />
      </ThreadsProvider>
    )

    expect(html).toContain("Open")
    expect(html).toContain("New Chat")
    expect(html).toContain("History")
    expect(html).toContain("Copilot content")
  })
})
