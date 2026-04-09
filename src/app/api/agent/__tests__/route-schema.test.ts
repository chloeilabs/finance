import { describe, expect, it } from "vitest"

import { AGENT_MAX_TOTAL_CHARS } from "@/lib/server/agent-runtime-config"

import {
  agentStreamRequestSchema,
  getTotalMessageChars,
  isConversationPayloadTooLarge,
} from "../route-schema"

describe("agentStreamRequestSchema", () => {
  it("accepts a valid request with messages", () => {
    const result = agentStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "Hello" }],
    })
    expect(result.success).toBe(true)
  })

  it("accepts a request with an optional model", () => {
    const result = agentStreamRequestSchema.safeParse({
      model: "minimax/minimax-m2.7",
      messages: [{ role: "user", content: "Hello" }],
    })
    expect(result.success).toBe(true)
  })

  it("rejects when messages is empty", () => {
    const result = agentStreamRequestSchema.safeParse({
      messages: [],
    })
    expect(result.success).toBe(false)
  })

  it("rejects when content is empty", () => {
    const result = agentStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects whitespace-only content", () => {
    const result = agentStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "   " }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid roles", () => {
    const result = agentStreamRequestSchema.safeParse({
      messages: [{ role: "system", content: "Hello" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects an unknown model", () => {
    const result = agentStreamRequestSchema.safeParse({
      model: "not-a-real-model",
      messages: [{ role: "user", content: "Hello" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejects extra properties via strict mode", () => {
    const result = agentStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "Hello" }],
      extraField: true,
    })
    expect(result.success).toBe(false)
  })

  it("rejects extra properties on messages via strict mode", () => {
    const result = agentStreamRequestSchema.safeParse({
      messages: [{ role: "user", content: "Hello", id: "abc" }],
    })
    expect(result.success).toBe(false)
  })

  it("accepts both user and assistant roles", () => {
    const result = agentStreamRequestSchema.safeParse({
      messages: [
        { role: "user", content: "Hello" },
        { role: "assistant", content: "Hi there" },
      ],
    })
    expect(result.success).toBe(true)
  })
})

describe("getTotalMessageChars", () => {
  it("returns 0 for an empty array", () => {
    expect(getTotalMessageChars([])).toBe(0)
  })

  it("sums character lengths across messages", () => {
    const messages = [
      { role: "user" as const, content: "Hello" },
      { role: "assistant" as const, content: "Hi there!" },
    ]
    expect(getTotalMessageChars(messages)).toBe(14)
  })

  it("counts a single message correctly", () => {
    const messages = [{ role: "user" as const, content: "abc" }]
    expect(getTotalMessageChars(messages)).toBe(3)
  })
})

describe("isConversationPayloadTooLarge", () => {
  it("returns false for a small payload", () => {
    const messages = [{ role: "user" as const, content: "Hello" }]
    expect(isConversationPayloadTooLarge(messages)).toBe(false)
  })

  it("returns true when total chars exceed the limit", () => {
    const longContent = "x".repeat(AGENT_MAX_TOTAL_CHARS + 1)
    const messages = [{ role: "user" as const, content: longContent }]
    expect(isConversationPayloadTooLarge(messages)).toBe(true)
  })
})
