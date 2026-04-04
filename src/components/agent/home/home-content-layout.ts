export type AssistantMessageLayout = "default" | "fullWidth"
export type ContentWidthMode = "default" | "rail"
export type UserMessageLayout = "bubble" | "fullWidth"

export function resolveHomeContentLayout({
  assistantMessageLayout = "default",
  contentWidthMode = "default",
  integratedLayout = false,
  isMobile = false,
  userMessageLayout = "bubble",
}: {
  assistantMessageLayout?: AssistantMessageLayout
  contentWidthMode?: ContentWidthMode
  integratedLayout?: boolean
  isMobile?: boolean
  userMessageLayout?: UserMessageLayout
}) {
  const shouldMatchCopilotRail =
    integratedLayout && isMobile && contentWidthMode === "default"

  return {
    assistantMessageLayout:
      shouldMatchCopilotRail && assistantMessageLayout === "default"
        ? "fullWidth"
        : assistantMessageLayout,
    contentWidthMode: shouldMatchCopilotRail ? "rail" : contentWidthMode,
    userMessageLayout:
      shouldMatchCopilotRail && userMessageLayout === "bubble"
        ? "fullWidth"
        : userMessageLayout,
  }
}
