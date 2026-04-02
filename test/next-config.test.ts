import { describe, expect, it } from "vitest"

import nextConfig from "../next.config.mjs"

describe("market workspace redirects", () => {
  it("redirects removed market routes to the canonical overview page", async () => {
    const redirects =
      typeof nextConfig.redirects === "function"
        ? await nextConfig.redirects()
        : []

    expect(redirects).toEqual(
      expect.arrayContaining([
        { destination: "/", permanent: true, source: "/assets" },
        { destination: "/", permanent: true, source: "/calendar" },
        { destination: "/", permanent: true, source: "/compare" },
        { destination: "/", permanent: true, source: "/data" },
        { destination: "/", permanent: true, source: "/markets" },
        { destination: "/", permanent: true, source: "/screeners" },
      ])
    )
  })
})
