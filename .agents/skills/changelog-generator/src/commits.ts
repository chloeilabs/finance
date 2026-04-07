import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CommitInfo } from "./types.js";

const execFileAsync = promisify(execFile);

const FIELD_SEPARATOR = "---FIELD---";
const RECORD_SEPARATOR = "---RECORD---";

const PR_PATTERNS = [/\(#(\d+)\)/, /Merge pull request #(\d+)/, /#(\d+)\s+from\s+/];

function extractPRNumber(message: string): number | undefined {
  for (const pattern of PR_PATTERNS) {
    const match = message.match(pattern);
    if (match) return parseInt(match[1], 10);
  }
  return undefined;
}

function parseCommitLine(raw: string): CommitInfo | null {
  const parts = raw.split(FIELD_SEPARATOR);
  if (parts.length < 4) return null;

  const [hash, message, author, date] = parts.map((p) => p.trim());
  if (!hash || !message) return null;

  return {
    hash,
    message,
    author,
    date,
    prNumber: extractPRNumber(message),
  };
}

export async function getCommits(range: string): Promise<CommitInfo[]> {
  const format = ["%H", "%s", "%an", "%aI"].join(FIELD_SEPARATOR);
  const { stdout } = await execFileAsync("git", ["log", `--format=${format}${RECORD_SEPARATOR}`, "--no-merges", range]);

  return stdout
    .split(RECORD_SEPARATOR)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCommitLine)
    .filter((c): c is CommitInfo => c !== null);
}

export async function getLatestTag(): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", ["describe", "--tags", "--abbrev=0"]);
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

export async function getVersionRange(explicitRange?: string): Promise<string> {
  if (explicitRange) return explicitRange;

  const tag = await getLatestTag();
  return tag ? `${tag}..HEAD` : "HEAD";
}
