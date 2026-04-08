import { describe, expect, it } from "vitest"

import {
  clampMarketCopilotWidth,
  DEFAULT_MARKET_COPILOT_WIDTH_PX,
  getMarketCopilotMaxWidthPx,
  getMarketCopilotSnapPoints,
  MAX_MARKET_COPILOT_WIDTH_RATIO,
  resolveMarketCopilotWidthFromPointer,
  snapMarketCopilotWidth,
} from "../market-copilot-sidebar-resize"

describe("market-copilot-sidebar-resize", () => {
  it("preserves the default rail width as the minimum", () => {
    expect(clampMarketCopilotWidth(240, 1600)).toBe(
      DEFAULT_MARKET_COPILOT_WIDTH_PX
    )
  })

  it("caps the desktop rail at 40 percent of the workspace", () => {
    expect(getMarketCopilotMaxWidthPx(2000)).toBe(
      Math.round(2000 * MAX_MARKET_COPILOT_WIDTH_RATIO)
    )
    expect(clampMarketCopilotWidth(900, 2000)).toBe(800)
  })

  it("exposes compact, midpoint, and expanded snap widths", () => {
    expect(getMarketCopilotSnapPoints(2000)).toEqual([352, 576, 800])
  })

  it("magnetically snaps near a snap point", () => {
    expect(snapMarketCopilotWidth(590, 2000)).toBe(576)
    expect(snapMarketCopilotWidth(730, 2000)).toBe(730)
  })

  it("derives the next width from the right-edge drag handle", () => {
    expect(
      resolveMarketCopilotWidthFromPointer({
        containerRight: 1400,
        pointerX: 760,
        containerWidth: 2000,
      })
    ).toBe(640)
  })

  it("uses a wider snap threshold when the drag is released", () => {
    expect(
      resolveMarketCopilotWidthFromPointer({
        containerRight: 1400,
        pointerX: 566,
        containerWidth: 2000,
        snapThresholdPx: 56,
      })
    ).toBe(800)
  })
})
