import { isBotAuthor } from "./enrich.js";
import type { CommitInfo, PRInfo } from "./types.js";

const EMAIL_PATTERN = /^[^@]+@[^@]+\.[^@]+$/;

function normalizeAuthor(name: string): string {
  return name.trim();
}

export function buildContributorList(commits: CommitInfo[], prs: Map<number, PRInfo>): string[] {
  const authors = new Set<string>();

  for (const commit of commits) {
    const name = normalizeAuthor(commit.author);
    if (name && !isBotAuthor(name) && !EMAIL_PATTERN.test(name)) {
      authors.add(name);
    }
  }

  for (const pr of prs.values()) {
    const name = normalizeAuthor(pr.author);
    if (name && !isBotAuthor(name) && !EMAIL_PATTERN.test(name)) {
      authors.add(name);
    }
  }

  return [...authors].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
}
