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

function getFmpMcpInstruction(planTier: string): string {
  const starterNote =
    planTier === "STARTER"
      ? "- Starter is validated here for quotes, company/reference data, statements, SEC filings, economic calendars, technical indicators, analyst estimates/consensus, and validated crypto, forex, and commodity symbols. Batch quotes, ETF exposure, 13F ownership, press releases, transcripts, and ESG may still be restricted."
      : ""

  return `
<fmp_mcp_tool_rules>
FMP MCP tools are available for this response.
- Prefer FMP tools first for quotes, company data, statements, filings, earnings or economic calendars, technical indicators, insider feeds, multi-asset symbols, and FMP-hosted news.
- Keep Tavily or other web tools for external commentary, third-party reporting, or pages that are not hosted in FMP.
- The configured FMP plan tier for this server is ${planTier}.
- Prefer live tool outcomes over static plan assumptions when they conflict.
${starterNote}
- Some FMP endpoints may be restricted by plan tier or availability. If an FMP tool fails, try a nearby FMP tool when it is still likely to answer the question.
- If the data still cannot be retrieved, say the FMP tool was unavailable or restricted and do not invent financial values.
</fmp_mcp_tool_rules>
`.trim()
}

export function withAiSdkInlineCitationInstruction(
  systemInstruction: string
): string {
  return `${systemInstruction}\n\n${AI_SDK_INLINE_CITATION_INSTRUCTION}`
}

export function withAiSdkFmpMcpInstruction(
  systemInstruction: string,
  planTier: string
): string {
  return `${systemInstruction}\n\n${getFmpMcpInstruction(planTier)}`
}
