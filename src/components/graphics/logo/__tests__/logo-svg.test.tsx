import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CleoLogoBurstSvg } from "../logo-burst-svg"
import { CleoLogoHoverSvg } from "../logo-hover-svg"
import { CleoLogoSvg } from "../logo-svg"

describe("Logo SVGs", () => {
  it("renders the base logo at full container size", () => {
    const html = renderToStaticMarkup(<CleoLogoSvg />)

    expect(html).toContain('class="size-full fill-current"')
  })

  it("renders the animated hover logo at full container size", () => {
    const html = renderToStaticMarkup(<CleoLogoHoverSvg />)

    expect(html).toContain('class="size-full fill-current"')
    expect(html).toContain("data-animate")
  })

  it("renders the burst logo at full container size", () => {
    const html = renderToStaticMarkup(<CleoLogoBurstSvg />)

    expect(html).toContain('class="size-full fill-current"')
    expect(html).toContain("data-animate")
  })
})
