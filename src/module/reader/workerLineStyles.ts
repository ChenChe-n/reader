export type LineMode = "markdown" | "text" | "json" | "html" | "fallback";

/**
 * 根据文本类型解析行样式。
 * @param line 原始行文本。
 * @param mode 文本模式。
 * @returns 行显示样式。
 */
export function styleForLine(line: string, mode: LineMode): Record<string, string> {
  if (mode === "json") return jsonLineStyle(line);
  if (mode === "markdown") return markdownLineStyle(line);
  return {};
}

/**
 * 解析 JSON 行样式。
 * @param line 原始行文本。
 * @returns 行样式。
 */
function jsonLineStyle(line: string): Record<string, string> {
  const trimmed = line.trim();
  if (!trimmed) return {};
  if (/^[\]}],?$/.test(trimmed) || /^[\[{],?$/.test(trimmed)) return { color: "#475569", fontWeight: "600" };
  if (/^"[^"]+"\s*:/.test(trimmed)) return { color: "#075985" };
  if (/\b(true|false|null)\b/.test(trimmed)) return { color: "#7c3aed" };
  if (/-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/.test(trimmed)) return { color: "#b45309" };
  return {};
}

/**
 * 解析 Markdown 行样式。
 * @param line 原始行文本。
 * @returns 行样式。
 */
function markdownLineStyle(line: string): Record<string, string> {
  if (/^#{1,6}\s+/.test(line)) return { color: "#0f172a", fontWeight: "700" };
  if (/^\s*>/.test(line)) return { color: "#64748b", borderLeft: "3px solid #cbd5e1", paddingLeft: "10px" };
  if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) return { color: "#334155" };
  if (/^\s*```/.test(line)) return { color: "#7c3aed", fontWeight: "600" };
  return {};
}
