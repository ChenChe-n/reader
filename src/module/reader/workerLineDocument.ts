import type { PreviewState } from "../../types";
import { continuationStyle, type LineMode, styleForLine } from "./workerLineStyles";

const MAX_LINE_LENGTH = 4096;

/**
 * 创建行文本预览。
 * @param text 文本内容。
 * @param mode 文本模式。
 * @returns 行文本预览。
 */
export function lineTextPreview(text: string, mode: LineMode): PreviewState {
  const lines: Record<string, { data: string; style: Record<string, string>; meta?: Record<string, string> }> = {};
  let index = 0;
  text.split(/\r\n|\n|\r/).forEach((line, sourceLine) => {
    const baseStyle = styleForLine(line, mode);
    if (!line) {
      lines[String(index)] = { data: "", style: baseStyle, meta: { sourceLine: String(sourceLine), chunk: "0" } };
      index += 1;
      return;
    }
    for (let offset = 0; offset < line.length; offset += MAX_LINE_LENGTH) {
      lines[String(index)] = {
        data: line.slice(offset, offset + MAX_LINE_LENGTH),
        style: offset ? continuationStyle(baseStyle) : baseStyle,
        meta: { sourceLine: String(sourceLine), chunk: String(offset / MAX_LINE_LENGTH) }
      };
      index += 1;
    }
  });
  return { kind: "lineText", lineText: { lines, lineCount: index } };
}
