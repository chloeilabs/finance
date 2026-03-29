import { afterEach, describe, expect, it, vi } from "vitest"

import { AvailableModels } from "@/lib/shared/llm/models"

import { runAgentStreamRequest } from "../agent-session-request"

describe("runAgentStreamRequest", () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
  })

  it("returns an aborted outcome when the request is canceled before a response arrives", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValue(
        new DOMException("signal is aborted without reason", "AbortError")
      ) as typeof fetch

    const outcome = await runAgentStreamRequest({
      signal: new AbortController().signal,
      model: AvailableModels.OPENROUTER_MINIMAX_M2_7,
      requestMessages: [],
      onProgress: vi.fn(),
    })

    expect(outcome).toMatchObject({
      kind: "aborted",
      accumulator: {
        content: "",
        reasoning: "",
        toolInvocations: [],
        activityTimeline: [],
        sources: [],
      },
    })
  })

  it("preserves partial output when the stream is aborted mid-response", async () => {
    const encoder = new TextEncoder()
    let readCount = 0
    const body = {
      getReader() {
        return {
          read: () => {
            if (readCount === 0) {
              readCount += 1

              return {
                done: false,
                value: encoder.encode(
                  JSON.stringify({
                    type: "text_delta",
                    delta: "Partial reply",
                    interactionId: "interaction-1",
                    lastEventId: "event-1",
                  }) + "\n"
                ),
              }
            }

            throw new DOMException("Timed out", "AbortError")
          },
        }
      },
    } as unknown as ReadableStream<Uint8Array>
    const response = {
      status: 200,
      ok: true,
      body,
    } as unknown as Response

    globalThis.fetch = vi.fn().mockResolvedValue(response) as typeof fetch

    const onProgress = vi.fn()
    const outcome = await runAgentStreamRequest({
      signal: new AbortController().signal,
      model: AvailableModels.OPENROUTER_MINIMAX_M2_7,
      requestMessages: [],
      onProgress,
    })

    expect(onProgress).toHaveBeenCalledTimes(1)
    expect(outcome).toMatchObject({
      kind: "aborted",
      accumulator: {
        content: "Partial reply",
        interactionId: "interaction-1",
        lastEventId: "event-1",
      },
    })
  })
})
