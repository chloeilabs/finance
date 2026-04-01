import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { Button } from "../button"

describe("Button", () => {
  it('defaults native buttons to type="button"', () => {
    const html = renderToStaticMarkup(<Button>Choose model</Button>)

    expect(html).toContain('type="button"')
  })

  it("preserves an explicit submit type", () => {
    const html = renderToStaticMarkup(<Button type="submit">Send</Button>)

    expect(html).toContain('type="submit"')
  })
})
