export interface CommitInfo {
  hash: string;
  message: string;
  author: string;
  date: string;
  prNumber?: number;
}

export interface PRInfo {
  number: number;
  title: string;
  body: string;
  labels: string[];
  author: string;
  linkedIssues: number[];
  mergeCommit?: string;
}

export type ChangeType = "added" | "changed" | "deprecated" | "removed" | "fixed" | "security" | "breaking";

export interface ChangeEntry {
  type: ChangeType;
  description: string;
  prNumber?: number;
  prUrl?: string;
  author: string;
  breaking: boolean;
  migrationGuide?: string;
}

export interface ChangelogOutput {
  version: string;
  date: string;
  entries: ChangeEntry[];
  contributors: string[];
  diffUrl?: string;
}

export interface ChangelogConfig {
  anthropicApiKey: string;
  githubToken: string;
  repository?: string;
  format: "keep-a-changelog" | "conventional" | "narrative";
  groupBy: "category" | "scope" | "author";
  includeBreaking: boolean;
  audience: "users" | "developers";
}
