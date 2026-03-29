import { MessageSquare, Pin } from "lucide-react"
import Link from "next/link"

import {
  EmptyState,
  PageHeader,
  SectionFrame,
} from "@/components/markets/ui/market-primitives"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatDateTime } from "@/lib/markets-format"
import { getCurrentViewer } from "@/lib/server/auth-session"
import { listThreadsForUser } from "@/lib/server/threads"
import { type Thread } from "@/lib/shared"

function getSingleParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value
  return raw?.trim() ?? ""
}

function getThreadSearchValue(thread: Thread) {
  return [
    thread.title,
    thread.metadata?.boundSymbol ?? "",
    ...thread.messages.map((message) => message.content),
  ]
    .join(" ")
    .toLowerCase()
    .trim()
}

function getThreadPreview(thread: Thread) {
  for (let index = thread.messages.length - 1; index >= 0; index -= 1) {
    const candidate = thread.messages[index]?.content.replace(/\s+/g, " ").trim()
    if (candidate) {
      return candidate
    }
  }

  return "No preview available."
}

function getMessageCountLabel(count: number) {
  return `${String(count)} ${count === 1 ? "message" : "messages"}`
}

function ThreadSection({
  title,
  threads,
}: {
  title: string
  threads: Thread[]
}) {
  if (threads.length === 0) {
    return null
  }

  return (
    <div className="space-y-3">
      <div className="font-departureMono text-[11px] tracking-[0.24em] text-muted-foreground uppercase">
        {title}
      </div>

      <div className="grid gap-px border border-border/70 bg-border/70">
        {threads.map((thread) => (
          <Link
            key={thread.id}
            href={`/copilot?thread=${encodeURIComponent(thread.id)}`}
            className="group bg-background px-4 py-4 transition-colors hover:bg-muted/30"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-departureMono text-sm tracking-tight text-foreground">
                    {thread.title}
                  </div>

                  {thread.isPinned ? (
                    <div className="inline-flex items-center gap-1 border border-border/70 px-1.5 py-0.5 font-departureMono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                      <Pin className="size-3" />
                      <span>Pinned</span>
                    </div>
                  ) : null}

                  {thread.metadata?.boundSymbol ? (
                    <div className="border border-border/70 px-1.5 py-0.5 font-departureMono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">
                      {thread.metadata.boundSymbol}
                    </div>
                  ) : null}
                </div>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {getThreadPreview(thread)}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <div className="inline-flex items-center gap-1.5">
                    <MessageSquare className="size-3.5" />
                    <span>{getMessageCountLabel(thread.messages.length)}</span>
                  </div>
                  <div>Updated {formatDateTime(thread.updatedAt)}</div>
                </div>
              </div>

              <div className="shrink-0 font-departureMono text-[11px] tracking-[0.18em] text-muted-foreground uppercase transition-colors group-hover:text-foreground">
                Resume
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await getCurrentViewer()

  if (!viewer) {
    return null
  }

  const resolvedSearchParams = await searchParams
  const rawQuery = getSingleParam(resolvedSearchParams.q)
  const query = rawQuery.toLowerCase()
  const threads = await listThreadsForUser(viewer.id)
  const filteredThreads =
    query.length > 0
      ? threads.filter((thread) => getThreadSearchValue(thread).includes(query))
      : threads

  const pinnedThreads = filteredThreads.filter((thread) => thread.isPinned)
  const recentThreads = filteredThreads.filter((thread) => !thread.isPinned)

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="History"
        title="Copilot history"
        description="Browse saved Copilot conversations without leaving the market workspace."
        actions={
          <Button asChild variant="outline">
            <Link href="/copilot">Open Copilot</Link>
          </Button>
        }
      />

      <SectionFrame
        title="Search history"
        description="Filter by thread title, bound symbol, or message text."
      >
        <form className="flex flex-col gap-3 sm:flex-row" method="GET">
          <Input
            className="rounded-none border-border/70"
            defaultValue={rawQuery}
            name="q"
            placeholder="Search threads, symbols, or message text"
          />
          <div className="flex gap-2">
            <Button type="submit">Search</Button>
            {query ? (
              <Button asChild variant="ghost">
                <Link href="/history">Clear</Link>
              </Button>
            ) : null}
          </div>
        </form>
      </SectionFrame>

      <SectionFrame
        title="Saved conversations"
        aside={`${String(filteredThreads.length)} ${filteredThreads.length === 1 ? "thread" : "threads"}`}
      >
        {threads.length === 0 ? (
          <EmptyState
            title="No conversation history yet"
            description="Start a Copilot conversation and it will appear here automatically."
          />
        ) : filteredThreads.length === 0 ? (
          <EmptyState
            title="No matching conversations"
            description="Try a broader search term or clear the current filter."
          />
        ) : (
          <div className="space-y-6">
            <ThreadSection title="Pinned" threads={pinnedThreads} />
            <ThreadSection title="Recent" threads={recentThreads} />
          </div>
        )}
      </SectionFrame>
    </div>
  )
}
