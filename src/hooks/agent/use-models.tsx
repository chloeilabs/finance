import { useQuery } from "@tanstack/react-query"

import { redirectToSignIn } from "@/lib/auth-client"
import {
  type ModelInfo,
  type ModelListItem,
  sanitizeModelInfos,
} from "@/lib/shared/llm/models"

type HttpError = Error & { status?: number }

function isModelListItem(value: unknown): value is ModelListItem {
  if (typeof value !== "object" || value === null) {
    return false
  }

  const candidate = value as { id?: unknown; name?: unknown }
  return typeof candidate.id === "string" && typeof candidate.name === "string"
}

function isModelListItemArray(value: unknown): value is ModelListItem[] {
  return Array.isArray(value) && value.every(isModelListItem)
}

function createHttpError(status: number, message: string): HttpError {
  const error = new Error(message) as HttpError
  error.status = status
  return error
}

export function useModels() {
  return useQuery({
    queryKey: ["models"],
    queryFn: async (): Promise<ModelInfo[]> => {
      const response = await fetch("/api/models")

      if (response.status === 401) {
        redirectToSignIn()
        throw createHttpError(401, "Unauthorized.")
      }

      if (!response.ok) {
        throw createHttpError(
          response.status,
          `HTTP error! status: ${String(response.status)}`
        )
      }

      const data: unknown = await response.json()
      if (!isModelListItemArray(data)) {
        throw new Error("Invalid model response.")
      }
      return sanitizeModelInfos(data)
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
    retry: (failureCount, error) =>
      (error as HttpError).status !== 401 && failureCount < 2,
  })
}
