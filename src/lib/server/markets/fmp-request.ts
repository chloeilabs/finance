import "server-only"

import { getConfiguredFmpApiKey, getFmpBaseUrl } from "./config"
import { recordMarketApiUsage } from "./store"

const FMP_PROVIDER_NAME = "fmp"
const DEFAULT_FMP_REQUEST_TIMEOUT_MS = 8_000
const DEFAULT_FMP_REQUEST_RETRIES = 1

function toUrlSearchParams(
  params: Record<string, string | number | boolean | undefined>
) {
  const searchParams = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) {
      continue
    }

    searchParams.set(key, String(value))
  }

  return searchParams
}

export class FmpRequestError extends Error {
  status: number
  code: string
  retryable: boolean

  constructor(params: {
    message: string
    status: number
    code: string
    retryable?: boolean
  }) {
    super(params.message)
    this.name = "FmpRequestError"
    this.status = params.status
    this.code = params.code
    this.retryable = params.retryable ?? false
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function shouldRetryStatus(status: number): boolean {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(status)
}

function createTimeoutSignal(timeoutMs: number): {
  signal: AbortSignal
  cleanup: () => void
} {
  if (typeof AbortSignal.timeout === "function") {
    return {
      signal: AbortSignal.timeout(timeoutMs),
      cleanup: () => undefined,
    }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => {
    controller.abort(new DOMException("Timed out", "AbortError"))
  }, timeoutMs)

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId)
    },
  }
}

function isRetryableFetchError(error: unknown): boolean {
  if (error instanceof FmpRequestError) {
    return error.retryable
  }

  if (isAbortError(error)) {
    return true
  }

  return error instanceof TypeError
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

export async function fetchFmpJson(
  path: string,
  params: Record<string, string | number | boolean | undefined> = {},
  options?: {
    timeoutMs?: number
    retries?: number
  }
): Promise<unknown> {
  const apiKey = getConfiguredFmpApiKey()

  if (!apiKey) {
    throw new FmpRequestError({
      message: "FMP is not configured.",
      status: 503,
      code: "fmp_not_configured",
    })
  }

  const query = toUrlSearchParams({
    ...params,
    apikey: apiKey,
  })
  const url = `${getFmpBaseUrl()}${path}?${query.toString()}`
  const timeoutMs = options?.timeoutMs ?? DEFAULT_FMP_REQUEST_TIMEOUT_MS
  const retries = Math.max(0, options?.retries ?? DEFAULT_FMP_REQUEST_RETRIES)

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const timeout = createTimeoutSignal(timeoutMs)

    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal: timeout.signal,
      })

      await recordMarketApiUsage(FMP_PROVIDER_NAME)

      if (!response.ok) {
        const error = new FmpRequestError({
          message: `FMP request failed for ${path} with status ${String(response.status)}.`,
          status: response.status,
          code:
            response.status === 402
              ? "fmp_endpoint_restricted"
              : "fmp_request_failed",
          retryable: shouldRetryStatus(response.status),
        })

        if (attempt < retries && error.retryable) {
          await wait(250 * (attempt + 1))
          continue
        }

        throw error
      }

      return await response.json()
    } catch (error) {
      if (attempt < retries && isRetryableFetchError(error)) {
        await wait(250 * (attempt + 1))
        continue
      }

      if (error instanceof FmpRequestError) {
        throw error
      }

      if (isAbortError(error)) {
        throw new FmpRequestError({
          message: `FMP request timed out for ${path}.`,
          status: 504,
          code: "fmp_request_timeout",
          retryable: true,
        })
      }

      if (error instanceof TypeError) {
        throw new FmpRequestError({
          message: `FMP network request failed for ${path}.`,
          status: 503,
          code: "fmp_network_error",
          retryable: true,
        })
      }

      throw error
    } finally {
      timeout.cleanup()
    }
  }

  throw new FmpRequestError({
    message: `FMP request failed for ${path}.`,
    status: 503,
    code: "fmp_request_failed",
    retryable: false,
  })
}
