import type { ModelType } from "@/lib/shared/llm/models"

export type PromptProvider = "openrouter"

export const PROMPT_OVERLAY_ORDER = [
  "high_stakes",
  "research",
  "coding",
  "closed_answer",
  "format_sensitive",
] as const

export type PromptOverlay = (typeof PROMPT_OVERLAY_ORDER)[number]

interface PromptSteeringMessage {
  role: "user" | "assistant"
  content: string
}

interface PromptSteeringBlock {
  label: string
  body: string
}

interface CreatePromptSteeringBlocksParams {
  provider?: PromptProvider
  overlays?: readonly PromptOverlay[]
  providerOverlaysEnabled?: boolean
  overlayBlocksEnabled?: boolean
}

const CODING_PATTERN =
  /\b(code|coding|function|class|script|algorithm|typescript|javascript|python|sql|regex|unit test|debug|bug fix|implement|write a program)\b/i
const RESEARCH_PATTERN =
  /\b(latest|current|today|recent|as of|source|sources|cite|citation|link|look up|lookup|verify|check the web|news|price right now|right now)\b/i
const HIGH_STAKES_PATTERN =
  /\b(bank|password|phishing|security|medical|doctor|symptom|symptoms|dose|dosage|prescription|pregnant|lawsuit|legal|tax|suicid|self-harm|chest pain|emergency|infection)\b/i
const CLOSED_ANSWER_PATTERN =
  /\b(multiple choice|choose one|which option|final answer|exact answer|boxed|answer:|confidence:|A\)|B\)|C\)|D\))\b/i
const STRICT_OUTPUT_PATTERN =
  /\b(return only|exactly|exact format|valid json|minified json|last line|single word|one word|single line|one line|two sentences|one sentence|one paragraph|no more than|under \d+ words|no surrounding prose|only one ```|schema|yaml|xml|csv)\b/i

const PROVIDER_OVERLAYS: Record<PromptProvider, string> = {
  openrouter: `
Use OpenRouter reasoning mode efficiently.
- Keep the final answer tighter than the hidden reasoning.
- On format-sensitive tasks, do a literal final-format check before finishing.
- Treat hard word, line, sentence, and schema constraints as hard constraints.
- Use tools only when they materially improve accuracy or freshness.
- After tool use, synthesize and stop. Do not replay raw tool output.
`.trim(),
}

const OVERLAY_BLOCKS: Record<PromptOverlay, string> = {
  format_sensitive: `
This request is parser-sensitive or format-sensitive.
- Exact compliance is mandatory.
- Return only the requested structure, wording, and delimiters.
- If a final line or key order is specified, check it literally before finishing.
- Treat word, sentence, paragraph, and line caps as hard limits. Count before finishing when close to the boundary.
- Cut any extra commentary that would reduce extractability.
`.trim(),
  closed_answer: `
This request expects one clear answer.
- Resolve ambiguity, choose the best answer, and commit.
- Keep explanation brief and keep the final answer unambiguous.
- If the task implies a required final-answer line, end with that exact line.
- If the required answer form is numeric, boxed, or one-line, return that form exactly without extra prose.
- Do not leave the answer buried in exploratory prose.
`.trim(),
  coding: `
This request is code-centric.
- Prefer runnable code and correct I/O behavior over explanation.
- If the user requests code only or one code block, obey that literally.
- Use the code_execution tool for arithmetic, spot checks, or quick validation when it reduces error risk.
- Do not add prose that would break copy-paste or grading.
`.trim(),
  research: `
This request needs freshness, sources, or verification.
- Decide what must be verified before answering.
- Search first, then extract pages only when you need more detail from a specific source.
- Use explicit dates when recency matters.
- If evidence is missing or conflicting, say that plainly instead of guessing.
`.trim(),
  high_stakes: `
This request is high-stakes.
- Optimize for correctness, concrete next actions, and low hallucination risk.
- If current or external facts matter, verify them when tools are available.
- Be direct and practical, not verbose or vague.
- In compromised-account, phishing, or financial-security scenarios, include immediate containment and stronger login protection such as 2FA/MFA when applicable.
- If something cannot be verified, say so explicitly rather than filling the gap.
`.trim(),
}

function normalizeUserText(messages: readonly PromptSteeringMessage[]): string {
  return messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.trim())
    .filter(Boolean)
    .join("\n\n")
}

function getLastUserMessage(
  messages: readonly PromptSteeringMessage[]
): string | null {
  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user" && message.content.trim())

  return lastUserMessage?.content.trim() ?? null
}

function hasPatternMatch(
  pattern: RegExp,
  lastUserMessage: string,
  fullUserText: string
): boolean {
  return pattern.test(lastUserMessage) || pattern.test(fullUserText)
}

function normalizePromptOverlays(
  overlays: readonly PromptOverlay[]
): PromptOverlay[] {
  const overlaySet = new Set(overlays)

  return PROMPT_OVERLAY_ORDER.filter((overlay) => overlaySet.has(overlay))
}

export function resolvePromptProvider(model: ModelType): PromptProvider {
  if (model.includes("/")) {
    return "openrouter"
  }

  throw new Error(`Unsupported model provider for model: ${model}`)
}

export function inferPromptOverlays(
  messages: readonly PromptSteeringMessage[]
): PromptOverlay[] {
  const lastUserMessage = getLastUserMessage(messages)
  if (!lastUserMessage) {
    return []
  }

  const fullUserText = normalizeUserText(messages)
  const overlays: PromptOverlay[] = []

  if (hasPatternMatch(HIGH_STAKES_PATTERN, lastUserMessage, fullUserText)) {
    overlays.push("high_stakes")
  }

  if (hasPatternMatch(RESEARCH_PATTERN, lastUserMessage, fullUserText)) {
    overlays.push("research")
  }

  if (hasPatternMatch(CODING_PATTERN, lastUserMessage, fullUserText)) {
    overlays.push("coding")
  }

  if (hasPatternMatch(CLOSED_ANSWER_PATTERN, lastUserMessage, fullUserText)) {
    overlays.push("closed_answer")
  }

  if (hasPatternMatch(STRICT_OUTPUT_PATTERN, lastUserMessage, fullUserText)) {
    overlays.push("format_sensitive")
  }

  return normalizePromptOverlays(overlays)
}

export function createPromptSteeringBlocks(
  params: CreatePromptSteeringBlocksParams
): PromptSteeringBlock[] {
  const blocks: PromptSteeringBlock[] = []

  if (params.provider && params.providerOverlaysEnabled !== false) {
    blocks.push({
      label: `PROVIDER OVERLAY: ${params.provider.toUpperCase()}`,
      body: PROVIDER_OVERLAYS[params.provider],
    })
  }

  if (params.overlayBlocksEnabled === false) {
    return blocks
  }

  for (const overlay of normalizePromptOverlays(params.overlays ?? [])) {
    blocks.push({
      label: `REQUEST OVERLAY: ${overlay.toUpperCase()}`,
      body: OVERLAY_BLOCKS[overlay],
    })
  }

  return blocks
}
