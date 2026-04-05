import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: ReactNode
    href: string
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
  useRouter: () => ({
    refresh: vi.fn(),
    replace: vi.fn(),
  }),
}))

vi.mock("@/components/auth/auth-shell", () => ({
  AuthShell: ({
    title,
    description,
    footer,
    children,
  }: {
    title: string
    description?: string
    footer?: ReactNode
    children: ReactNode
  }) => (
    <div>
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
      {children}
      {footer ? <footer>{footer}</footer> : null}
    </div>
  ),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: {
      email: vi.fn(),
    },
  },
}))

vi.mock("@/lib/server/auth", () => ({
  isAuthConfigured: vi.fn(),
}))

vi.mock("@/lib/server/auth-session", () => ({
  getCurrentViewer: vi.fn(),
}))

import { redirect } from "next/navigation"

import { isAuthConfigured } from "@/lib/server/auth"
import { getCurrentViewer } from "@/lib/server/auth-session"

import SignInPage from "../sign-in/page"

describe("SignInPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isAuthConfigured).mockReturnValue(true)
    vi.mocked(getCurrentViewer).mockResolvedValue(null)
  })

  it("renders the sign-in form without a footer note", async () => {
    const markup = renderToStaticMarkup(
      await SignInPage({
        searchParams: Promise.resolve({}),
      })
    )

    expect(markup).toContain("Sign In")
    expect(markup).toContain("Sign up")
    expect(markup).toContain('aria-label="Show password"')
    expect((markup.match(/>Show</g) ?? []).length).toBe(1)
    expect(markup).toContain('type="password"')
    expect(markup).not.toContain(
      "Welcome back. Sign in to access your Yurie Markets workspace."
    )
    expect(markup).not.toContain("<footer")
    expect(redirect).not.toHaveBeenCalled()
  })
})
