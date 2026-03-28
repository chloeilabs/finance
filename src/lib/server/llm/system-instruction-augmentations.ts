const AI_SDK_INLINE_CITATION_INSTRUCTION = `
<ai_sdk_inline_citation_rules>
When Tavily tool results are used in the answer, cite them inline with markdown links, not only in a sources list.
- Place the citation immediately after the sentence or clause it supports.
- Prefer the exact \`citationMarkdown\` value returned in Tavily tool results when available.
- Use only URLs that came from tool results in this response.
- Do not emit bare URLs when a markdown link will do.
- Keep citations compact and natural. Usually one or two citations per paragraph is enough.
</ai_sdk_inline_citation_rules>
`.trim()

export function withAiSdkInlineCitationInstruction(
  systemInstruction: string
): string {
  return `${systemInstruction}\n\n${AI_SDK_INLINE_CITATION_INSTRUCTION}`
}
