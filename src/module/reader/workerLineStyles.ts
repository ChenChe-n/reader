export type LineMode = "markdown" | "text" | "json" | "html" | "fallback";

/**
 * 根据文本类型解析行样式。
 * @param line 原始行文本。
 * @param mode 文本模式。
 * @returns 行显示样式。
 */
export function styleForLine(line: string, mode: LineMode): Record<string, string> {
  if (mode === "markdown") return markdownLineStyle(line);
  return {};
}

/**
 * 解析 Markdown 行样式。
 * @param line 原始行文本。
 * @returns 行样式。
 */
function markdownLineStyle(line: string): Record<string, string> {
  if (/^#{1,6}\s+/.test(line)) return { color: "var(--text)", fontWeight: "700" };
  if (/^\s*>/.test(line)) return { color: "var(--muted)", borderLeft: "3px solid var(--line-strong)", paddingLeft: "10px" };
  if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) return { color: "var(--text)" };
  if (/^\s*```/.test(line)) return { color: "var(--accent)", fontWeight: "600" };
  return {};
}
