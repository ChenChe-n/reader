import type { PreviewState } from "../../types";
import { type LineMode, styleForLine } from "./workerLineStyles";

/**
 * 创建行文本预览（每段逻辑行一行，不再按长度切块）。
 * @param text 文本内容。
 * @param mode 文本模式。
 * @returns 行文本预览。
 */
export function lineTextPreview(text: string, mode: LineMode): PreviewState {
  const lines: Record<string, { data: string; style: Record<string, string>; meta?: Record<string, string> }> = {};
  let index = 0;
  text.split(/\r\n|\n|\r/).forEach((line, sourceLine) => {
    const baseStyle = styleForLine(line, mode);
    lines[String(index)] = {
      data: line,
      style: baseStyle,
      meta: { sourceLine: String(sourceLine), chunk: "0" }
    };
    index += 1;
  });
  return { kind: "lineText", lineText: { lines, lineCount: index } };
}
