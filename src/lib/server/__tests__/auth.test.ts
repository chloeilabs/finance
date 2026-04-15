import { afterEach, describe, expect, it, vi } from "vitest"

import { isAuthConfigured, resolveAuthCookieDomain } from "../auth"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("resolveAuthCookieDomain", () => {
  it("disables cross-subdomain cookies for localhost development", () => {
    expect(
      resolveAuthCookieDomain("http://localhost:3000", "chloei.ai")
    ).toBeNull()
  })

  it("keeps the configured domain for matching production hosts", () => {
    expect(
      resolveAuthCookieDomain("https://finance.chloei.ai", "chloei.ai")
    ).toBe("chloei.ai")
  })

  it("ignores cookie domains that do not match the auth origin host", () => {
    expect(
      resolveAuthCookieDomain("https://finance.example.com", "chloei.ai")
    ).toBeNull()
  })

  it("normalizes a leading dot on the configured cookie domain", () => {
    expect(
      resolveAuthCookieDomain("https://finance.chloei.ai", ".chloei.ai")
    ).toBe("chloei.ai")
  })
})

describe("isAuthConfigured", () => {
  it("accepts Vercel deployment URLs as the auth base URL fallback", () => {
    vi.stubEnv("DATABASE_URL", "postgres://finance")
    vi.stubEnv("BETTER_AUTH_SECRET", "secret")
    vi.stubEnv("VERCEL_ENV", "preview")
    vi.stubEnv("VERCEL_URL", "finance-git-main-chloei.vercel.app")

    expect(isAuthConfigured()).toBe(true)
  })
})
