import { describe, expect, it } from "vitest"

import { getCopilotOpenHref } from "../market-copilot-sidebar-utils"

describe("getCopilotOpenHref", () => {
  it("opens the base copilot route when there is no active thread", () => {
    expect(getCopilotOpenHref(null)).toBe("/copilot")
  })

  it("opens the active thread when one is selected", () => {
    expect(getCopilotOpenHref("thread-123")).toBe("/copilot?thread=thread-123")
  })

  it("encodes the thread id for use in the copilot route", () => {
    expect(getCopilotOpenHref("thread with/slash")).toBe(
      "/copilot?thread=thread%20with%2Fslash"
    )
  })
})
