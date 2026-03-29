import type { Thread } from "@/lib/shared/threads"

const DAY_IN_MS = 24 * 60 * 60 * 1_000

export function getThreadSearchValue(thread: Thread) {
  return `${thread.title} ${thread.messages.map((message) => message.content).join(" ")}`
    .toLowerCase()
    .trim()
}

function getSortTimestamp(value: string): number {
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

export function sortThreadsByRecency(threads: Thread[]): Thread[] {
  return [...threads].sort((left, right) => {
    const updatedDelta =
      getSortTimestamp(right.updatedAt) - getSortTimestamp(left.updatedAt)

    if (updatedDelta !== 0) {
      return updatedDelta
    }

    const createdDelta =
      getSortTimestamp(right.createdAt) - getSortTimestamp(left.createdAt)

    if (createdDelta !== 0) {
      return createdDelta
    }

    return left.id.localeCompare(right.id)
  })
}

export function getThreadDateGroupLabel(updatedAt: string) {
  const targetDate = new Date(updatedAt)

  if (Number.isNaN(targetDate.getTime())) {
    return "Older"
  }

  const now = new Date()
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  )
  const startOfTarget = new Date(
    targetDate.getFullYear(),
    targetDate.getMonth(),
    targetDate.getDate()
  )
  const dayDelta = Math.floor(
    (startOfToday.getTime() - startOfTarget.getTime()) / DAY_IN_MS
  )

  if (dayDelta <= 0) {
    return "Today"
  }

  if (dayDelta === 1) {
    return "Yesterday"
  }

  if (dayDelta < 7) {
    return "Previous 7 Days"
  }

  return targetDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}

export function groupThreadsForSearch(threads: Thread[]) {
  const groups: { label: string; threads: Thread[] }[] = []

  for (const thread of threads) {
    const label = getThreadDateGroupLabel(thread.updatedAt)
    const currentGroup = groups[groups.length - 1]

    if (currentGroup?.label !== label) {
      groups.push({
        label,
        threads: [thread],
      })
      continue
    }

    currentGroup.threads.push(thread)
  }

  return groups
}
