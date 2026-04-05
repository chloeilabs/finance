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
    signUp: {
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

import SignUpPage from "../sign-up/page"

describe("SignUpPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(isAuthConfigured).mockReturnValue(true)
    vi.mocked(getCurrentViewer).mockResolvedValue(null)
  })

  it("renders the sign-up form without a footer note", async () => {
    const markup = renderToStaticMarkup(
      await SignUpPage({
        searchParams: Promise.resolve({}),
      })
    )

    expect(markup).toContain("Create Account")
    expect(markup).toContain("Sign in")
    expect(markup).toContain('placeholder="Jane Doe"')
    expect(markup).not.toContain('placeholder="Yurie User"')
    expect(markup).toContain('aria-label="Show password"')
    expect(markup).toContain('aria-label="Show confirm password"')
    expect((markup.match(/>Show</g) ?? []).length).toBe(2)
    expect(markup).not.toContain(
      "By creating an account, you agree to Yurie Markets&#x27; Terms of Service and Privacy Policy."
    )
    expect(markup).not.toContain("<footer")
    expect(redirect).not.toHaveBeenCalled()
  })
})
