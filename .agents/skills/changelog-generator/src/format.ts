import type Anthropic from "@anthropic-ai/sdk";
import type { ChangeEntry, ChangelogOutput, ChangeType } from "./types.js";

const SECTION_ORDER: ChangeType[] = ["breaking", "added", "changed", "deprecated", "removed", "fixed", "security"];

const SECTION_TITLES: Record<ChangeType, string> = {
  breaking: "Breaking Changes",
  added: "Added",
  changed: "Changed",
  deprecated: "Deprecated",
  removed: "Removed",
  fixed: "Fixed",
  security: "Security",
};

function groupByType(entries: ChangeEntry[]): Map<ChangeType, ChangeEntry[]> {
  const groups = new Map<ChangeType, ChangeEntry[]>();
  for (const entry of entries) {
    const key = entry.breaking ? "breaking" : entry.type;
    const list = groups.get(key) ?? [];
    list.push(entry);
    groups.set(key, list);
  }
  return groups;
}

function formatEntryLine(entry: ChangeEntry): string {
  const prRef = entry.prNumber ? ` (#${entry.prNumber})` : "";
  let line = `- ${entry.description}${prRef}`;
  if (entry.migrationGuide) {
    const indented = entry.migrationGuide
      .split("\n")
      .map((l) => `  ${l}`)
      .join("\n");
    line += `\n${indented}`;
  }
  return line;
}

export function formatKeepAChangelog(output: ChangelogOutput): string {
  const lines: string[] = [];
  lines.push(`## [${output.version}] - ${output.date}`);
  lines.push("");

  const groups = groupByType(output.entries);

  for (const type of SECTION_ORDER) {
    const entries = groups.get(type);
    if (!entries || entries.length === 0) continue;
    lines.push(`### ${SECTION_TITLES[type]}`);
    lines.push("");
    for (const entry of entries) {
      lines.push(formatEntryLine(entry));
    }
    lines.push("");
  }

  if (output.contributors.length > 0) {
    lines.push("### Contributors");
    lines.push("");
    lines.push(output.contributors.map((c) => `@${c}`).join(", "));
    lines.push("");
  }

  if (output.diffUrl) {
    lines.push(`[${output.version}]: ${output.diffUrl}`);
    lines.push("");
  }

  return lines.join("\n");
}

const CONVENTIONAL_MAP: Record<string, ChangeType[]> = {
  Features: ["added"],
  "Bug Fixes": ["fixed"],
  Performance: ["changed"],
  Deprecations: ["deprecated"],
  Removals: ["removed"],
  Security: ["security"],
  "Breaking Changes": ["breaking"],
  "Other Changes": [],
};

export function formatConventional(output: ChangelogOutput): string {
  const lines: string[] = [];
  lines.push(`## ${output.version} (${output.date})`);
  lines.push("");

  const groups = groupByType(output.entries);
  const claimed = new Set<ChangeType>();

  for (const [heading, types] of Object.entries(CONVENTIONAL_MAP)) {
    if (types.length === 0) continue;
    const entries = types.flatMap((t) => groups.get(t) ?? []);
    if (entries.length === 0) continue;
    for (const t of types) claimed.add(t);
    lines.push(`### ${heading}`);
    lines.push("");
    for (const entry of entries) {
      lines.push(formatEntryLine(entry));
    }
    lines.push("");
  }

  const unclaimed = [...groups.entries()].filter(([type]) => !claimed.has(type));
  if (unclaimed.length > 0) {
    lines.push("### Other Changes");
    lines.push("");
    for (const [, entries] of unclaimed) {
      for (const entry of entries) {
        lines.push(formatEntryLine(entry));
      }
    }
    lines.push("");
  }

  if (output.contributors.length > 0) {
    lines.push("### Contributors");
    lines.push("");
    lines.push(output.contributors.map((c) => `@${c}`).join(", "));
    lines.push("");
  }

  return lines.join("\n");
}

export async function formatNarrative(output: ChangelogOutput, client: Anthropic): Promise<string> {
  const entrySummaries = output.entries
    .map((e) => {
      const prRef = e.prNumber ? ` (#${e.prNumber})` : "";
      return `- [${e.type}] ${e.description}${prRef}`;
    })
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `Write release notes for version ${output.version} (${output.date}) in a narrative prose style.
Include a brief highlight paragraph, then cover the key changes. Mention breaking changes prominently.
End with contributor acknowledgments.

Changes:
${entrySummaries}

Contributors: ${output.contributors.map((c) => `@${c}`).join(", ")}

Write in a professional, friendly tone suitable for a project blog or GitHub Release.`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return `# ${output.version} Release Notes\n\n${text}`;
}

export async function formatChangelog(output: ChangelogOutput, format: string, client?: Anthropic): Promise<string> {
  switch (format) {
    case "conventional":
      return formatConventional(output);
    case "narrative": {
      if (!client) {
        throw new Error("Narrative format requires an Anthropic client");
      }
      return formatNarrative(output, client);
    }
    default:
      return formatKeepAChangelog(output);
  }
}
