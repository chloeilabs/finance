export interface ApiErrorPayload {
  code?: string
  error?: string
}

export async function readApiErrorMessage(
  response: Response,
  fallback: string
): Promise<string> {
  try {
    const payload = (await response.json()) as ApiErrorPayload

    if (typeof payload.error === "string" && payload.error.trim() !== "") {
      return payload.error
    }
  } catch {
    // Ignore non-JSON and empty responses and fall back to the caller message.
  }

  return fallback
}
