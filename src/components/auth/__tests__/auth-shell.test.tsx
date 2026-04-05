import type { ReactNode } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

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

vi.mock("@/components/graphics/effects/refresh-glow", () => ({
  RefreshGlow: ({ className }: { className?: string }) => (
    <div className={className}>Glow</div>
  ),
}))

vi.mock("@/components/graphics/logo/logo-hover", () => ({
  LogoHover: () => <div>Logo</div>,
}))

import { AuthShell } from "../auth-shell"

describe("AuthShell", () => {
  it("renders the auth brand as Yurie Markets", () => {
    const markup = renderToStaticMarkup(
      <AuthShell title="Sign In">
        <div>Form content</div>
      </AuthShell>
    )

    expect(markup).toContain("Yurie Markets")
    expect(markup).not.toContain(">Yurie<")
    expect(markup).toContain("Sign In")
  })
})
