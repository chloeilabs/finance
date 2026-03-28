import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"

import { DATABASE_URL_ENV_NAME, getDatabase } from "./postgres"

declare global {
  var yurieAuth: ReturnType<typeof createAuth> | undefined
}

const AUTH_DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 10
const AUTH_DEFAULT_RATE_LIMIT_MAX_REQUESTS = 100
const AUTH_CREDENTIAL_RATE_LIMIT_WINDOW_SECONDS = 15 * 60
const AUTH_CREDENTIAL_RATE_LIMIT_MAX_REQUESTS = 5
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30
const RAILWAY_URL_ENV_NAME_PATTERN = /^RAILWAY_SERVICE_.+_URL$/
const AUTH_UNAVAILABLE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const
export const AUTH_REQUIRED_ENV_NAMES = [
  DATABASE_URL_ENV_NAME,
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
] as const
export const AUTH_UNAVAILABLE_MESSAGE = "Authentication is not configured."

type AuthRequiredEnvName = (typeof AUTH_REQUIRED_ENV_NAMES)[number]

function getConfiguredEnv(name: AuthRequiredEnvName): string | null {
  const value = process.env[name]?.trim()
  if (!value) {
    return null
  }

  return value
}

function getMissingAuthConfig(): AuthRequiredEnvName[] {
  return AUTH_REQUIRED_ENV_NAMES.filter((name) => !getConfiguredEnv(name))
}

export function isAuthConfigured(): boolean {
  return getMissingAuthConfig().length === 0
}

export function createAuthUnavailableResponse(headers?: HeadersInit): Response {
  const responseHeaders = new Headers(AUTH_UNAVAILABLE_RESPONSE_HEADERS)

  for (const [key, value] of new Headers(headers).entries()) {
    responseHeaders.set(key, value)
  }

  return Response.json(
    { error: AUTH_UNAVAILABLE_MESSAGE },
    {
      status: 503,
      headers: responseHeaders,
    }
  )
}

function getRequiredEnv(
  name: Exclude<AuthRequiredEnvName, typeof DATABASE_URL_ENV_NAME>
): string {
  const value = getConfiguredEnv(name)

  if (!value) {
    throw new Error(`Missing ${name}.`)
  }

  return value
}

function getTrustedOrigins(baseUrl: string): string[] {
  const trustedOrigins = new Set<string>([baseUrl])
  const rawTrustedOrigins = process.env.BETTER_AUTH_TRUSTED_ORIGINS

  if (rawTrustedOrigins) {
    for (const origin of rawTrustedOrigins.split(",")) {
      const normalizedOrigin = normalizeOrigin(origin)
      if (normalizedOrigin) {
        trustedOrigins.add(normalizedOrigin)
      }
    }
  }

  for (const origin of getRailwayOrigins()) {
    trustedOrigins.add(origin)
  }

  return [...trustedOrigins]
}

function normalizeOrigin(value: string): string | null {
  const trimmedValue = value.trim()

  if (!trimmedValue) {
    return null
  }

  try {
    return new URL(trimmedValue).origin
  } catch {
    try {
      return new URL(`https://${trimmedValue}`).origin
    } catch {
      return null
    }
  }
}

function getRailwayOrigins(): string[] {
  const railwayOriginCandidates = Object.entries(process.env)
    .filter(
      ([name, value]) =>
        Boolean(value) &&
        (name === "RAILWAY_PUBLIC_DOMAIN" ||
          name === "RAILWAY_STATIC_URL" ||
          RAILWAY_URL_ENV_NAME_PATTERN.test(name))
    )
    .map(([, value]) => value)

  const railwayOrigins = new Set<string>()

  for (const originCandidate of railwayOriginCandidates) {
    if (!originCandidate) {
      continue
    }

    const normalizedOrigin = normalizeOrigin(originCandidate)
    if (normalizedOrigin) {
      railwayOrigins.add(normalizedOrigin)
    }
  }

  return [...railwayOrigins]
}

function getAllowedHosts(trustedOrigins: string[]): string[] {
  const allowedHosts = new Set<string>()

  for (const origin of trustedOrigins) {
    allowedHosts.add(new URL(origin).host)
  }

  return [...allowedHosts]
}

function createAuth() {
  const betterAuthUrl = getRequiredEnv("BETTER_AUTH_URL")
  const betterAuthSecret = getRequiredEnv("BETTER_AUTH_SECRET")
  const trustedOrigins = getTrustedOrigins(betterAuthUrl)
  const allowedHosts = getAllowedHosts(trustedOrigins)
  const baseURL =
    allowedHosts.length > 1
      ? {
          allowedHosts,
          fallback: betterAuthUrl,
        }
      : betterAuthUrl

  return betterAuth({
    database: {
      db: getDatabase(),
      type: "postgres",
    },
    secret: betterAuthSecret,
    baseURL,
    trustedOrigins,
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 8,
      autoSignIn: true,
    },
    session: {
      expiresIn: THIRTY_DAYS_IN_SECONDS,
    },
    rateLimit: {
      enabled: true,
      window: AUTH_DEFAULT_RATE_LIMIT_WINDOW_SECONDS,
      max: AUTH_DEFAULT_RATE_LIMIT_MAX_REQUESTS,
      customRules: {
        "/sign-in/email": {
          window: AUTH_CREDENTIAL_RATE_LIMIT_WINDOW_SECONDS,
          max: AUTH_CREDENTIAL_RATE_LIMIT_MAX_REQUESTS,
        },
        "/sign-up/email": {
          window: AUTH_CREDENTIAL_RATE_LIMIT_WINDOW_SECONDS,
          max: AUTH_CREDENTIAL_RATE_LIMIT_MAX_REQUESTS,
        },
      },
    },
    plugins: [nextCookies()],
  })
}

export function getAuthOrNull(): ReturnType<typeof createAuth> | null {
  if (!isAuthConfigured()) {
    return null
  }

  globalThis.yurieAuth ??= createAuth()
  return globalThis.yurieAuth
}
