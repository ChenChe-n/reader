/**
 * 与 Worker 一致的换行切分。
 * @param text 全文。
 * @returns 逻辑行数组（不含换行符）。
 */
export function textToLogicalLines(text: string): string[] {
  if (!text) return [""];
  return text.split(/\r\n|\n|\r/);
}

/**
 * 用 `\n` 拼接逻辑行（保存为 UTF-8 时由上层处理）。
 * @param lines 逻辑行。
 * @returns 全文。
 */
export function logicalLinesToText(lines: readonly string[]): string {
  return lines.join("\n");
}
