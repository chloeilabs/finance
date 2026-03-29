"use client"

import { normalizeThread, type Thread } from "@/lib/shared/threads"

export const THREAD_SYNC_ERROR_TOAST_ID = "thread-sync-error"
export const THREAD_DELETE_ERROR_TOAST_ID = "thread-delete-error"

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

async function getErrorMessage(response: Response, fallbackMessage: string) {
  return response
    .json()
    .then((payload: unknown) => {
      if (
        typeof payload === "object" &&
        payload !== null &&
        "error" in payload &&
        typeof payload.error === "string"
      ) {
        return payload.error
      }

      return fallbackMessage
    })
    .catch(() => fallbackMessage)
}

export async function persistThreadRequest(
  thread: Thread,
  signal: AbortSignal
): Promise<Thread> {
  const response = await fetch("/api/threads", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(thread),
    signal,
  })

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to save conversation history.")
    )
  }

  const payload: unknown = await response.json()

  if (typeof payload !== "object" || payload === null) {
    throw new Error("Invalid thread response.")
  }

  return normalizeThread(payload as Thread)
}

export async function deleteThreadRequest(id: string): Promise<void> {
  const response = await fetch("/api/threads", {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id }),
  })

  if (!response.ok) {
    throw new Error(
      await getErrorMessage(response, "Failed to delete conversation history.")
    )
  }
}
