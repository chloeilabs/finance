import { describe, expect, it } from "vitest"

import { asRecord, asString, isAbortError } from "../cast"

describe("asRecord", () => {
  it("returns the object when given a plain object", () => {
    const obj = { a: 1, b: "two" }
    expect(asRecord(obj)).toBe(obj)
  })

  it("returns null for null", () => {
    expect(asRecord(null)).toBeNull()
  })

  it("returns null for undefined", () => {
    expect(asRecord(undefined)).toBeNull()
  })

  it("returns null for a string", () => {
    expect(asRecord("hello")).toBeNull()
  })

  it("returns null for a number", () => {
    expect(asRecord(42)).toBeNull()
  })

  it("returns null for a boolean", () => {
    expect(asRecord(false)).toBeNull()
  })

  it("returns the array as a record for arrays", () => {
    const arr = [1, 2, 3]
    expect(asRecord(arr)).toBe(arr)
  })
})

describe("asString", () => {
  it("returns the string when given a string", () => {
    expect(asString("hello")).toBe("hello")
  })

  it("returns the empty string for an empty string", () => {
    expect(asString("")).toBe("")
  })

  it("returns null for a number", () => {
    expect(asString(42)).toBeNull()
  })

  it("returns null for null", () => {
    expect(asString(null)).toBeNull()
  })

  it("returns null for undefined", () => {
    expect(asString(undefined)).toBeNull()
  })

  it("returns null for an object", () => {
    expect(asString({ toString: () => "hi" })).toBeNull()
  })

  it("returns null for a boolean", () => {
    expect(asString(true)).toBeNull()
  })
})

describe("isAbortError", () => {
  it("returns true for an Error with name AbortError", () => {
    const error = new Error("aborted")
    error.name = "AbortError"
    expect(isAbortError(error)).toBe(true)
  })

  it("returns true for an Error with name TimeoutError", () => {
    const error = new Error("timed out")
    error.name = "TimeoutError"
    expect(isAbortError(error)).toBe(true)
  })

  it("returns true for a DOMException with name AbortError", () => {
    const error = new DOMException("aborted", "AbortError")
    expect(isAbortError(error)).toBe(true)
  })

  it("returns true for a DOMException with name TimeoutError", () => {
    const error = new DOMException("timed out", "TimeoutError")
    expect(isAbortError(error)).toBe(true)
  })

  it("returns false for a regular Error", () => {
    expect(isAbortError(new Error("regular error"))).toBe(false)
  })

  it("returns false for null", () => {
    expect(isAbortError(null)).toBe(false)
  })

  it("returns false for undefined", () => {
    expect(isAbortError(undefined)).toBe(false)
  })

  it("returns false for a plain string", () => {
    expect(isAbortError("AbortError")).toBe(false)
  })
})
