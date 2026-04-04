import { describe, expect, it } from "vitest"

import { resolveHomeContentLayout } from "../home-content-layout"

describe("resolveHomeContentLayout", () => {
  it("matches the copilot rail layout for integrated mobile conversations", () => {
    expect(
      resolveHomeContentLayout({
        integratedLayout: true,
        isMobile: true,
      })
    ).toEqual({
      assistantMessageLayout: "fullWidth",
      contentWidthMode: "rail",
      userMessageLayout: "fullWidth",
    })
  })

  it("preserves desktop copilot page defaults", () => {
    expect(
      resolveHomeContentLayout({
        integratedLayout: true,
        isMobile: false,
      })
    ).toEqual({
      assistantMessageLayout: "default",
      contentWidthMode: "default",
      userMessageLayout: "bubble",
    })
  })

  it("keeps explicit rail settings intact", () => {
    expect(
      resolveHomeContentLayout({
        assistantMessageLayout: "fullWidth",
        contentWidthMode: "rail",
        integratedLayout: true,
        isMobile: true,
        userMessageLayout: "fullWidth",
      })
    ).toEqual({
      assistantMessageLayout: "fullWidth",
      contentWidthMode: "rail",
      userMessageLayout: "fullWidth",
    })
  })
})
