import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { CompanyProfileCopy } from "../company-profile-copy"

describe("CompanyProfileCopy", () => {
  it("renders collapsed copy with a toggle by default", () => {
    const html = renderToStaticMarkup(
      <CompanyProfileCopy text="Apple designs, manufactures, and markets consumer devices." />
    )

    expect(html).toContain("line-clamp-4")
    expect(html).toContain("Show more")
  })

  it("renders full copy without a toggle when not collapsible", () => {
    const html = renderToStaticMarkup(
      <CompanyProfileCopy
        collapsible={false}
        text="Apple designs, manufactures, and markets consumer devices."
      />
    )

    expect(html).not.toContain("line-clamp-4")
    expect(html).not.toContain("Show more")
    expect(html).not.toContain("Show less")
  })
})
