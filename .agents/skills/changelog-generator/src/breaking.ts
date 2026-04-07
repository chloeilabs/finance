import type Anthropic from "@anthropic-ai/sdk";
import type { ChangeEntry, PRInfo } from "./types.js";

function gatherContext(entry: ChangeEntry, prs: Map<number, PRInfo>): string {
  const parts: string[] = [`Change: ${entry.description}`];

  if (entry.prNumber) {
    const pr = prs.get(entry.prNumber);
    if (pr) {
      parts.push(`PR title: ${pr.title}`);
      if (pr.body) {
        parts.push(`PR body (excerpt): ${pr.body.slice(0, 800)}`);
      }
      if (pr.labels.length > 0) {
        parts.push(`Labels: ${pr.labels.join(", ")}`);
      }
    }
  }

  return parts.join("\n");
}

async function generateMigrationGuide(_entry: ChangeEntry, context: string, client: Anthropic): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Generate a concise migration guide for a breaking change.

${context}

Write a migration guide with exactly these three parts:
1. **What changed**: one sentence explaining the change
2. **What you need to do**: one sentence on the action required
3. **Example**: a short before/after code snippet if applicable

Keep the guide under 10 lines. Use markdown formatting.
Return ONLY the migration guide text, no preamble.`,
      },
    ],
  });

  return response.content[0].type === "text" ? response.content[0].text.trim() : "";
}

export async function analyzeBreakingChanges(
  entries: ChangeEntry[],
  prs: Map<number, PRInfo>,
  client: Anthropic,
): Promise<ChangeEntry[]> {
  const results: ChangeEntry[] = [];

  for (const entry of entries) {
    if (!entry.breaking) {
      results.push(entry);
      continue;
    }

    const context = gatherContext(entry, prs);
    const migrationGuide = await generateMigrationGuide(entry, context, client);

    results.push({
      ...entry,
      migrationGuide: migrationGuide || undefined,
    });
  }

  return results;
}
