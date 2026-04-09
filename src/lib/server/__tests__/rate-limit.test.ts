import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  evaluateAndConsumeSlidingWindowRateLimit,
  tryAcquireConcurrencySlot,
} from "../rate-limit"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("evaluateAndConsumeSlidingWindowRateLimit", () => {
  const windowMs = 60_000
  const maxRequests = 3
  let testId = 0

  function nextId() {
    testId += 1
    return `rate-limit-test:${String(testId)}`
  }

  function evaluate(identifier?: string) {
    return evaluateAndConsumeSlidingWindowRateLimit({
      identifier: identifier ?? nextId(),
      maxRequests,
      windowMs,
    })
  }

  it("allows requests under the limit", () => {
    const result = evaluate()
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
    expect(result.retryAfterSeconds).toBeNull()
  })

  it("decrements remaining with each request", () => {
    const id = nextId()
    evaluate(id)
    const second = evaluate(id)
    expect(second.allowed).toBe(true)
    expect(second.remaining).toBe(1)

    const third = evaluate(id)
    expect(third.allowed).toBe(true)
    expect(third.remaining).toBe(0)
  })

  it("denies requests when the limit is reached", () => {
    const id = nextId()
    evaluate(id)
    evaluate(id)
    evaluate(id)

    const fourth = evaluate(id)
    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })

  it("reports the correct limit value", () => {
    const result = evaluate()
    expect(result.limit).toBe(maxRequests)
  })

  it("resets after the window expires", () => {
    const id = nextId()
    evaluate(id)
    evaluate(id)
    evaluate(id)

    vi.advanceTimersByTime(windowMs + 1)

    const result = evaluate(id)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(2)
  })

  it("isolates identifiers from each other", () => {
    const idA = nextId()
    const idB = nextId()
    evaluate(idA)
    evaluate(idA)
    evaluate(idA)

    const resultA = evaluate(idA)
    expect(resultA.allowed).toBe(false)

    const resultB = evaluate(idB)
    expect(resultB.allowed).toBe(true)
    expect(resultB.remaining).toBe(2)
  })

  it("provides a resetAtEpochSeconds in the future", () => {
    vi.setSystemTime(new Date("2025-01-01T00:00:00Z"))
    const result = evaluate()
    const nowEpochSeconds = Math.floor(Date.now() / 1000)
    expect(result.resetAtEpochSeconds).toBeGreaterThan(nowEpochSeconds)
  })

  it("retryAfterSeconds is at least 1 when denied", () => {
    const id = nextId()
    evaluate(id)
    evaluate(id)
    evaluate(id)

    const denied = evaluate(id)
    expect(denied.retryAfterSeconds).toBeGreaterThanOrEqual(1)
  })
})

describe("tryAcquireConcurrencySlot", () => {
  const maxConcurrent = 2
  const windowMs = 60_000
  let testId = 100

  function nextId() {
    testId += 1
    return `concurrency-test:${String(testId)}`
  }

  function acquire(identifier?: string) {
    return tryAcquireConcurrencySlot({
      identifier: identifier ?? nextId(),
      maxConcurrent,
      windowMs,
    })
  }

  it("allows requests under the concurrency limit", () => {
    const slot = acquire()
    expect(slot.allowed).toBe(true)
    expect(slot.inFlight).toBe(1)
    expect(slot.retryAfterSeconds).toBeNull()
    slot.release()
  })

  it("tracks in-flight count", () => {
    const id = nextId()
    const first = acquire(id)
    const second = acquire(id)
    expect(first.inFlight).toBe(1)
    expect(second.inFlight).toBe(2)
    first.release()
    second.release()
  })

  it("denies when the concurrency limit is reached", () => {
    const id = nextId()
    const first = acquire(id)
    const second = acquire(id)

    const third = acquire(id)
    expect(third.allowed).toBe(false)
    expect(third.retryAfterSeconds).toBe(1)

    first.release()
    second.release()
  })

  it("allows new requests after a slot is released", () => {
    const id = nextId()
    const first = acquire(id)
    const second = acquire(id)

    first.release()

    const third = acquire(id)
    expect(third.allowed).toBe(true)
    third.release()
    second.release()
  })

  it("release is idempotent", () => {
    const id = nextId()
    const slot = acquire(id)
    slot.release()
    slot.release()
    slot.release()

    const next = acquire(id)
    expect(next.allowed).toBe(true)
    expect(next.inFlight).toBe(1)
    next.release()
  })

  it("isolates identifiers from each other", () => {
    const idA = nextId()
    const idB = nextId()
    const a1 = acquire(idA)
    const a2 = acquire(idA)

    const denied = acquire(idA)
    expect(denied.allowed).toBe(false)

    const b1 = acquire(idB)
    expect(b1.allowed).toBe(true)

    a1.release()
    a2.release()
    b1.release()
  })

  it("reports the correct limit value", () => {
    const slot = acquire()
    expect(slot.limit).toBe(maxConcurrent)
    slot.release()
  })
})
