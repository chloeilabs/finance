import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { PasswordInput } from "../password-input"

describe("PasswordInput", () => {
  it("renders the auth toggle without finance button metadata", () => {
    const markup = renderToStaticMarkup(
      <PasswordInput id="sign-in-password" value="" onChange={vi.fn()} />
    )

    expect(markup).toContain('aria-label="Show password"')
    expect(markup).toContain('type="button"')
    expect(markup).not.toContain('data-variant="ghost"')
    expect(markup).not.toContain('data-size="sm"')
    expect(markup).not.toContain("active:not-aria-[haspopup]:translate-y-px")
  })
})
