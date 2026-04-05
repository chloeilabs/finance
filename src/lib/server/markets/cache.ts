import "server-only"

import { FmpRequestError } from "./client"
import { getFmpSoftMinuteLimit, isFmpConfigured } from "./config"
import {
  getCachedMarketPayload,
  getCachedMarketPayloadSnapshot,
  getMarketApiUsageForCurrentMinute,
  setCachedMarketPayload,
} from "./store"

export async function mayUseLiveFmp() {
  if (!isFmpConfigured()) {
    return false
  }

  const softMinuteLimit = getFmpSoftMinuteLimit()
  const usage = await getMarketApiUsageForCurrentMinute("fmp").catch(() => 0)
  return usage < softMinuteLimit
}

export async function withMarketCache<T>(params: {
  cacheKey: string
  category: string
  ttlSeconds: number
  fallback: T
  allowLive?: boolean
  staleOnError?: boolean
  fetcher: () => Promise<T>
}): Promise<T> {
  const cached = await getCachedMarketPayload<T>(params.cacheKey).catch(
    () => undefined
  )

  if (cached !== undefined) {
    return cached
  }

  const allowLive = params.allowLive ?? true

  if (!allowLive || !(await mayUseLiveFmp())) {
    if (params.staleOnError) {
      const staleSnapshot = await getCachedMarketPayloadSnapshot<T>(
        params.cacheKey,
        { includeExpired: true }
      ).catch(() => undefined)

      if (staleSnapshot?.payload !== undefined) {
        return staleSnapshot.payload
      }
    }

    return params.fallback
  }

  try {
    const value = await params.fetcher()
    await setCachedMarketPayload({
      cacheKey: params.cacheKey,
      category: params.category,
      ttlSeconds: params.ttlSeconds,
      payload: value,
    }).catch(() => undefined)
    return value
  } catch (error) {
    if (error instanceof FmpRequestError) {
      if (params.staleOnError) {
        const staleSnapshot = await getCachedMarketPayloadSnapshot<T>(
          params.cacheKey,
          { includeExpired: true }
        ).catch(() => undefined)

        if (staleSnapshot?.payload !== undefined) {
          return staleSnapshot.payload
        }
      }

      return params.fallback
    }

    throw error
  }
}
