import { AUTH_UNAVAILABLE_MESSAGE, getAuthOrNull } from "./src/lib/server/auth"

const auth = getAuthOrNull()

if (!auth) {
  throw new Error(
    `${AUTH_UNAVAILABLE_MESSAGE} Set DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL before running auth commands.`
  )
}

export { auth }
