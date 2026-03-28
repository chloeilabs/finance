import { redirect } from "next/navigation"

import { AuthShell } from "@/components/auth/auth-shell"
import { AuthUnavailableState } from "@/components/auth/auth-unavailable-state"
import { SignUpForm } from "@/components/auth/sign-up-form"
import { readSearchParam, sanitizeAuthRedirectPath } from "@/lib/auth-redirect"
import { isAuthConfigured } from "@/lib/server/auth"
import { getCurrentViewer } from "@/lib/server/auth-session"

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const redirectTo = sanitizeAuthRedirectPath(
    readSearchParam(params.redirectTo)
  )

  if (!isAuthConfigured()) {
    return (
      <AuthShell
        title="Sign Up Unavailable"
        description="Authentication is not configured on this deployment yet."
        footer="Set the required server environment variables, then reload this page."
      >
        <AuthUnavailableState />
      </AuthShell>
    )
  }

  const viewer = await getCurrentViewer()

  if (viewer) {
    redirect(redirectTo)
  }

  return (
    <AuthShell
      title="Create Account"
      description="Set up your Yurie account to save your session and use the app."
      footer="New accounts can sign in immediately after registration."
    >
      <SignUpForm redirectTo={redirectTo} />
    </AuthShell>
  )
}
