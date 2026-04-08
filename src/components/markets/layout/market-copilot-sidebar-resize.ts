export const DEFAULT_MARKET_COPILOT_WIDTH_PX = 352
export const MIN_MARKET_COPILOT_WIDTH_PX = DEFAULT_MARKET_COPILOT_WIDTH_PX
export const MAX_MARKET_COPILOT_WIDTH_RATIO = 0.4
export const MARKET_COPILOT_WIDTH_STEP_PX = 16
export const MARKET_COPILOT_SNAP_THRESHOLD_PX = 24
export const MARKET_COPILOT_RELEASE_SNAP_THRESHOLD_PX = 56

export function getMarketCopilotMaxWidthPx(containerWidth: number) {
  return Math.max(
    MIN_MARKET_COPILOT_WIDTH_PX,
    Math.round(containerWidth * MAX_MARKET_COPILOT_WIDTH_RATIO)
  )
}

export function clampMarketCopilotWidth(
  nextWidth: number,
  containerWidth: number
) {
  return Math.min(
    Math.max(nextWidth, MIN_MARKET_COPILOT_WIDTH_PX),
    getMarketCopilotMaxWidthPx(containerWidth)
  )
}

export function getMarketCopilotSnapPoints(containerWidth: number) {
  const maxWidth = getMarketCopilotMaxWidthPx(containerWidth)
  const midpointWidth = Math.round((MIN_MARKET_COPILOT_WIDTH_PX + maxWidth) / 2)

  return [...new Set([MIN_MARKET_COPILOT_WIDTH_PX, midpointWidth, maxWidth])]
}

export function snapMarketCopilotWidth(
  nextWidth: number,
  containerWidth: number,
  thresholdPx = MARKET_COPILOT_SNAP_THRESHOLD_PX
) {
  const clampedWidth = clampMarketCopilotWidth(nextWidth, containerWidth)
  let closestSnapPoint = clampedWidth
  let closestDistance = Number.POSITIVE_INFINITY

  for (const snapPoint of getMarketCopilotSnapPoints(containerWidth)) {
    const snapDistance = Math.abs(snapPoint - clampedWidth)

    if (snapDistance < closestDistance) {
      closestSnapPoint = snapPoint
      closestDistance = snapDistance
    }
  }

  return closestDistance <= thresholdPx ? closestSnapPoint : clampedWidth
}

export function resolveMarketCopilotWidthFromPointer({
  containerRight,
  pointerX,
  containerWidth,
  snapThresholdPx = MARKET_COPILOT_SNAP_THRESHOLD_PX,
}: {
  containerRight: number
  pointerX: number
  containerWidth: number
  snapThresholdPx?: number
}) {
  return snapMarketCopilotWidth(
    containerRight - pointerX,
    containerWidth,
    snapThresholdPx
  )
}
