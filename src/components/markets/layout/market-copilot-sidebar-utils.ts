export function getCopilotOpenHref(currentThreadId: string | null) {
  if (!currentThreadId) {
    return "/copilot"
  }

  return `/copilot?thread=${encodeURIComponent(currentThreadId)}`
}
