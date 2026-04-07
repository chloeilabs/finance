import type { ChangelogConfig } from "./types.js";

const VALID_FORMATS = ["keep-a-changelog", "conventional", "narrative"] as const;
const VALID_GROUP_BY = ["category", "scope", "author"] as const;
const VALID_AUDIENCES = ["users", "developers"] as const;

function envOrDefault(key: string, fallback: string): string {
  return process.env[key]?.trim() || fallback;
}

function parseBoolean(value: string): boolean {
  return ["true", "1", "yes"].includes(value.toLowerCase());
}

function validateEnum<T extends string>(value: string, allowed: readonly T[], label: string): T {
  if (!allowed.includes(value as T)) {
    throw new Error(`Invalid ${label}: "${value}". Must be one of: ${allowed.join(", ")}`);
  }
  return value as T;
}

export function loadConfig(): ChangelogConfig {
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY ?? "";
  const githubToken = process.env.GITHUB_TOKEN ?? "";
  const repository = process.env.GITHUB_REPOSITORY?.trim() || process.env.GITHUB_REPO?.trim() || undefined;

  if (!anthropicApiKey) {
    console.warn(
      "ANTHROPIC_API_KEY not set — Claude-based classification and narrative formatting will be unavailable",
    );
  }

  const rawFormat = envOrDefault("FORMAT", "keep-a-changelog");
  const rawGroupBy = envOrDefault("GROUP_BY", "category");
  const rawAudience = envOrDefault("AUDIENCE", "users");

  return {
    anthropicApiKey,
    githubToken,
    repository,
    format: validateEnum(rawFormat, VALID_FORMATS, "FORMAT"),
    groupBy: validateEnum(rawGroupBy, VALID_GROUP_BY, "GROUP_BY"),
    includeBreaking: parseBoolean(envOrDefault("INCLUDE_BREAKING", "true")),
    audience: validateEnum(rawAudience, VALID_AUDIENCES, "AUDIENCE"),
  };
}
