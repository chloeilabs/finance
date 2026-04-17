import { betterAuth } from "better-auth"
import { nextCookies } from "better-auth/next-js"

import {
  DATABASE_URL_ENV_NAME,
  getAuthDatabase,
} from "./postgres"

declare global {
  var financeAuth: ReturnType<typeof createAuth> | undefined
}

const AUTH_DEFAULT_RATE_LIMIT_WINDOW_SECONDS = 10
const AUTH_DEFAULT_RATE_LIMIT_MAX_REQUESTS = 100
const AUTH_CREDENTIAL_RATE_LIMIT_WINDOW_SECONDS = 15 * 60
const AUTH_CREDENTIAL_RATE_LIMIT_MAX_REQUESTS = 5
const THIRTY_DAYS_IN_SECONDS = 60 * 60 * 24 * 30
const VERCEL_ENV = "VERCEL_ENV" as const
const VERCEL_BRANCH_URL_ENV = "VERCEL_BRANCH_URL" as const
const VERCEL_URL_ENV = "VERCEL_URL" as const
const VERCEL_PROJECT_PRODUCTION_URL_ENV = "VERCEL_PROJECT_PRODUCTION_URL" as const
const AUTH_UNAVAILABLE_RESPONSE_HEADERS = {
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
} as const
export const AUTH_REQUIRED_ENV_NAMES = [
  DATABASE_URL_ENV_NAME,
  "BETTER_AUTH_SECRET",
] as const
export const AUTH_UNAVAILABLE_MESSAGE = "Authentication is not configured."

type AuthRequiredEnvName =
  | (typeof AUTH_REQUIRED_ENV_NAMES)[number]
  | "BETTER_AUTH_URL"

function getConfiguredValue(name: string): string | null {
  const value = process.env[name]?.trim()
  if (!value) {
    return null
  }

  return value
}

function getConfiguredEnv(name: AuthRequiredEnvName): string | null {
  if (name === "BETTER_AUTH_URL") {
    return getConfiguredAuthBaseUrl()
  }

  return getConfiguredValue(name)
}

function getConfiguredVercelAuthUrl(): string | null {
  const vercelEnvironment = getConfiguredValue(VERCEL_ENV)
  const vercelOriginCandidates =
    vercelEnvironment === "production"
      ? [
          getConfiguredValue(VERCEL_PROJECT_PRODUCTION_URL_ENV),
          getConfiguredValue(VERCEL_BRANCH_URL_ENV),
          getConfiguredValue(VERCEL_URL_ENV),
        ]
      : [
          getConfiguredValue(VERCEL_BRANCH_URL_ENV),
          getConfiguredValue(VERCEL_URL_ENV),
          getConfiguredValue(VERCEL_PROJECT_PRODUCTION_URL_ENV),
        ]

  for (const originCandidate of vercelOriginCandidates) {
    const normalizedOrigin = normalizeOrigin(originCandidate ?? "")
    if (normalizedOrigin) {
      return normalizedOrigin
    }
  }

  return null
}

function getConfiguredAuthBaseUrl(): string | null {
  return getConfiguredValue("BETTER_AUTH_URL") ?? getConfiguredVercelAuthUrl()
}

function getMissingAuthConfig(): AuthRequiredEnvName[] {
  const missing: AuthRequiredEnvName[] = AUTH_REQUIRED_ENV_NAMES.filter((name) =>
    !getConfiguredEnv(name)
  )

  if (!getConfiguredAuthBaseUrl()) {
    missing.push("BETTER_AUTH_URL")
  }

  return missing
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
  if (name === "BETTER_AUTH_URL") {
    const baseUrl = getConfiguredAuthBaseUrl()
    if (!baseUrl) {
      throw new Error(`Missing ${name}.`)
    }

    return baseUrl
  }

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

function getAllowedHosts(trustedOrigins: string[]): string[] {
  const allowedHosts = new Set<string>()

  for (const origin of trustedOrigins) {
    allowedHosts.add(new URL(origin).host)
  }

  return [...allowedHosts]
}

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  )
}

export function resolveAuthCookieDomain(
  baseUrl: string,
  configuredCookieDomain: string | undefined = process.env.BETTER_AUTH_COOKIE_DOMAIN
): string | null {
  const cookieDomain = configuredCookieDomain?.trim()

  if (!cookieDomain) {
    return null
  }

  const normalizedCookieDomain = cookieDomain.replace(/^\./u, "").toLowerCase()

  try {
    const hostname = new URL(baseUrl).hostname.toLowerCase()

    if (isLoopbackHostname(hostname)) {
      return null
    }

    if (
      hostname === normalizedCookieDomain ||
      hostname.endsWith(`.${normalizedCookieDomain}`)
    ) {
      return normalizedCookieDomain
    }
  } catch {
    return null
  }

  return null
}

function createAuth() {
  const betterAuthUrl = getRequiredEnv("BETTER_AUTH_URL")
  const betterAuthSecret = getRequiredEnv("BETTER_AUTH_SECRET")
  const trustedOrigins = getTrustedOrigins(betterAuthUrl)
  const allowedHosts = getAllowedHosts(trustedOrigins)
  const cookieDomain = resolveAuthCookieDomain(betterAuthUrl)
  const baseURL =
    allowedHosts.length > 1
      ? {
          allowedHosts,
          fallback: betterAuthUrl,
        }
      : betterAuthUrl

  return betterAuth({
    database: {
      db: getAuthDatabase(),
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
    advanced: cookieDomain
      ? {
          crossSubDomainCookies: {
            enabled: true,
            domain: cookieDomain,
          },
        }
      : undefined,
    plugins: [nextCookies()],
  })
}

export function getAuthOrNull(): ReturnType<typeof createAuth> | null {
  if (!isAuthConfigured()) {
    return null
  }

  globalThis.financeAuth ??= createAuth()
  return globalThis.financeAuth
}
