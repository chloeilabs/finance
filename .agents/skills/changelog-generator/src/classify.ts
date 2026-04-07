import type Anthropic from "@anthropic-ai/sdk";
import { isBotAuthor } from "./enrich.js";
import type { ChangeEntry, ChangelogConfig, ChangeType, CommitInfo, PRInfo } from "./types.js";

const LABEL_MAP: Record<string, ChangeType> = {
  enhancement: "added",
  feature: "added",
  "new feature": "added",
  bug: "fixed",
  bugfix: "fixed",
  fix: "fixed",
  deprecated: "deprecated",
  deprecation: "deprecated",
  removed: "removed",
  removal: "removed",
  security: "security",
  vulnerability: "security",
  breaking: "breaking",
  "breaking-change": "breaking",
  "breaking change": "breaking",
};

const CONVENTIONAL_PREFIXES: Record<string, ChangeType> = {
  feat: "added",
  fix: "fixed",
  deprecate: "deprecated",
  remove: "removed",
  security: "security",
  perf: "changed",
  refactor: "changed",
  docs: "changed",
  style: "changed",
  chore: "changed",
  ci: "changed",
  build: "changed",
  test: "changed",
};

function classifyFromLabels(labels: string[]): ChangeType | null {
  for (const label of labels) {
    const mapped = LABEL_MAP[label.toLowerCase()];
    if (mapped) return mapped;
  }
  return null;
}

function classifyFromPrefix(message: string): ChangeType | null {
  const match = message.match(/^(\w+)(!)?(\(.+\))?:\s/);
  if (!match) return null;
  const prefix = match[1].toLowerCase();
  if (match[2] === "!") return "breaking";
  return CONVENTIONAL_PREFIXES[prefix] ?? null;
}

function isBreakingCommit(message: string): boolean {
  return (
    message.startsWith("BREAKING CHANGE:") || message.startsWith("BREAKING-CHANGE:") || /^\w+!(\(.+\))?:/.test(message)
  );
}

function isBreakingPR(pr: PRInfo): boolean {
  return pr.labels.some(
    (l) =>
      l.toLowerCase() === "breaking" || l.toLowerCase() === "breaking-change" || l.toLowerCase() === "breaking change",
  );
}

function consolidateBotCommits(
  commits: CommitInfo[],
  prs: Map<number, PRInfo>,
): { botEntry: ChangeEntry | null; remaining: CommitInfo[] } {
  const botCommits: CommitInfo[] = [];
  const remaining: CommitInfo[] = [];

  for (const commit of commits) {
    const pr = commit.prNumber ? prs.get(commit.prNumber) : undefined;
    const author = pr?.author ?? commit.author;
    if (isBotAuthor(author)) {
      botCommits.push(commit);
    } else {
      remaining.push(commit);
    }
  }

  if (botCommits.length === 0) return { botEntry: null, remaining: commits };

  const botEntry: ChangeEntry = {
    type: "changed",
    description: `Dependencies updated (${botCommits.length} package${botCommits.length === 1 ? "" : "s"})`,
    author: "dependabot[bot]",
    breaking: false,
  };

  return { botEntry, remaining };
}

function buildPrUrl(prNumber: number | undefined, config: ChangelogConfig): string | undefined {
  if (!prNumber || !config.repository) {
    return undefined;
  }
  return `https://github.com/${config.repository}/pull/${prNumber}`;
}

async function classifyWithClaude(
  commits: CommitInfo[],
  prs: Map<number, PRInfo>,
  config: ChangelogConfig,
  client: Anthropic,
): Promise<ChangeEntry[]> {
  const items = commits.map((c) => {
    const pr = c.prNumber ? prs.get(c.prNumber) : undefined;
    return {
      hash: c.hash.slice(0, 8),
      message: c.message,
      author: pr?.author ?? c.author,
      prTitle: pr?.title,
      prBody: pr?.body?.slice(0, 500),
      labels: pr?.labels,
      prNumber: c.prNumber,
    };
  });

  const audienceGuidance =
    config.audience === "users"
      ? "Describe user-visible impact without implementation details."
      : "Include technical details like component names and API changes.";

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: `Classify these git commits into changelog entries. ${audienceGuidance}

For each commit, output a JSON array of objects with:
- type: one of "added", "changed", "deprecated", "removed", "fixed", "security", "breaking"
- description: a concise, human-readable changelog line
- author: the commit/PR author
- breaking: boolean
- prNumber: the PR number if available

Commits:
${JSON.stringify(items, null, 2)}

Return ONLY a valid JSON array, no other text.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  const parsed: Array<{
    type: ChangeType;
    description: string;
    author: string;
    breaking: boolean;
    prNumber?: number;
  }> = JSON.parse(jsonMatch[0]);

  return parsed.map((item) => ({
    type: item.type,
    description: item.description,
    author: item.author,
    breaking: item.breaking,
    prNumber: item.prNumber,
    prUrl: buildPrUrl(item.prNumber, config),
  }));
}

export async function classifyChanges(
  commits: CommitInfo[],
  prs: Map<number, PRInfo>,
  config: ChangelogConfig,
  client: Anthropic,
): Promise<ChangeEntry[]> {
  const { botEntry, remaining } = consolidateBotCommits(commits, prs);
  const entries: ChangeEntry[] = [];

  const needsClaude: CommitInfo[] = [];

  for (const commit of remaining) {
    const pr = commit.prNumber ? prs.get(commit.prNumber) : undefined;
    const labelType = pr ? classifyFromLabels(pr.labels) : null;
    const prefixType = classifyFromPrefix(commit.message);
    const type = labelType ?? prefixType;

    if (type) {
      const breaking = isBreakingCommit(commit.message) || (pr ? isBreakingPR(pr) : false);

      entries.push({
        type: breaking ? "breaking" : type,
        description: pr?.title ?? commit.message.replace(/^\w+!?(\(.+\))?:\s/, ""),
        prNumber: commit.prNumber,
        prUrl: buildPrUrl(commit.prNumber, config),
        author: pr?.author ?? commit.author,
        breaking,
      });
    } else {
      needsClaude.push(commit);
    }
  }

  if (needsClaude.length > 0) {
    const claudeEntries = await classifyWithClaude(needsClaude, prs, config, client);
    entries.push(...claudeEntries);
  }

  if (botEntry) entries.push(botEntry);

  return entries;
}
