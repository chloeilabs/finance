import { headers } from "next/headers"

import type { AuthViewer } from "@/lib/shared/auth"

import { getAuthOrNull } from "./auth"

export interface AuthSessionUser {
  id: string
  name: string
  email: string
}

export interface AuthSessionValue {
  user: AuthSessionUser
}

export type AuthSession = AuthSessionValue | null

function toViewer(session: AuthSession): AuthViewer | null {
  if (!session) {
    return null
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
  }
}

export async function getRequestSession(
  requestHeaders: Headers
): Promise<AuthSession> {
  const auth = getAuthOrNull()

  if (!auth) {
    return null
  }

  return auth.api.getSession({
    headers: requestHeaders,
  })
}

async function getCurrentSession(): Promise<AuthSession> {
  const auth = getAuthOrNull()

  if (!auth) {
    return null
  }

  return auth.api.getSession({
    headers: new Headers(await headers()),
  })
}

export async function getCurrentViewer(): Promise<AuthViewer | null> {
  return toViewer(await getCurrentSession())
}
