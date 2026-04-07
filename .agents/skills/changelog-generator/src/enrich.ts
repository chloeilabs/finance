import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommitInfo, PRInfo } from "./types.js";

const execFileAsync = promisify(execFile);

const BOT_AUTHORS = [
  "dependabot[bot]",
  "dependabot",
  "renovate[bot]",
  "renovate",
  "github-actions[bot]",
  "github-actions",
  "greenkeeper[bot]",
  "snyk-bot",
];

export function isBotAuthor(author: string): boolean {
  const lower = author.toLowerCase();
  return BOT_AUTHORS.some((bot) => lower === bot.toLowerCase() || lower.includes(bot.toLowerCase()));
}

interface GHPRResponse {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
  author: { login: string };
  closingIssuesReferences?: { nodes?: Array<{ number: number }> };
}

async function fetchPR(prNumber: number): Promise<PRInfo | null> {
  try {
    const { stdout } = await execFileAsync("gh", [
      "pr",
      "view",
      String(prNumber),
      "--json",
      "number,title,body,labels,author,closingIssuesReferences",
    ]);

    const data: GHPRResponse = JSON.parse(stdout);

    const linkedIssues: number[] = [];
    if (data.closingIssuesReferences?.nodes) {
      for (const node of data.closingIssuesReferences.nodes) {
        linkedIssues.push(node.number);
      }
    }

    return {
      number: data.number,
      title: data.title,
      body: data.body ?? "",
      labels: data.labels.map((l) => l.name),
      author: data.author.login,
      linkedIssues,
    };
  } catch {
    return null;
  }
}

export async function enrichWithPRs(
  commits: CommitInfo[],
): Promise<{ commits: CommitInfo[]; prs: Map<number, PRInfo> }> {
  const prs = new Map<number, PRInfo>();
  const seenPRNumbers = new Set<number>();
  const enrichedCommits: CommitInfo[] = [];

  for (const commit of commits) {
    if (commit.prNumber && !seenPRNumbers.has(commit.prNumber)) {
      seenPRNumbers.add(commit.prNumber);
      const prInfo = await fetchPR(commit.prNumber);
      if (prInfo) {
        prs.set(commit.prNumber, prInfo);
      }
    }
    enrichedCommits.push(commit);
  }

  const deduped: CommitInfo[] = [];
  const prCommitSeen = new Set<number>();

  for (const commit of enrichedCommits) {
    if (commit.prNumber && prCommitSeen.has(commit.prNumber)) {
      continue;
    }
    if (commit.prNumber) {
      prCommitSeen.add(commit.prNumber);
    }
    deduped.push(commit);
  }

  return { commits: deduped, prs };
}
