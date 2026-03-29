import { describe, expect, it } from "vitest"

import { resolvePersistedOpenState } from "@/components/markets/layout/sidebar-open-state"

describe("resolvePersistedOpenState", () => {
  it("returns the provided default when no cookie is set", () => {
    expect(resolvePersistedOpenState(undefined)).toBe(false)
    expect(resolvePersistedOpenState(undefined, true)).toBe(true)
  })

  it("keeps persisted open and closed values", () => {
    expect(resolvePersistedOpenState("true")).toBe(true)
    expect(resolvePersistedOpenState("false", true)).toBe(false)
  })

  it("treats unexpected cookie values as closed", () => {
    expect(resolvePersistedOpenState("unexpected", true)).toBe(false)
  })
})
