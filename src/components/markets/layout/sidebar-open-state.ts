export function resolvePersistedOpenState(
  cookieValue: string | undefined,
  defaultOpen = false
): boolean {
  if (cookieValue === undefined) {
    return defaultOpen
  }

  return cookieValue === "true"
}
