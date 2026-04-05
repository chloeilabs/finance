import { describe, expect, it } from "vitest"

import { resolveAuthCookieDomain } from "../auth"

describe("resolveAuthCookieDomain", () => {
  it("disables cross-subdomain cookies for localhost development", () => {
    expect(
      resolveAuthCookieDomain("http://localhost:3000", "yurie.ai")
    ).toBeNull()
  })

  it("keeps the configured domain for matching production hosts", () => {
    expect(
      resolveAuthCookieDomain("https://markets.yurie.ai", "yurie.ai")
    ).toBe("yurie.ai")
  })

  it("ignores cookie domains that do not match the auth origin host", () => {
    expect(
      resolveAuthCookieDomain("https://markets.example.com", "yurie.ai")
    ).toBeNull()
  })

  it("normalizes a leading dot on the configured cookie domain", () => {
    expect(
      resolveAuthCookieDomain("https://markets.yurie.ai", ".yurie.ai")
    ).toBe("yurie.ai")
  })
})
