import type { LineTextSpan } from "../../../../types";
import { codeLineSpans, type CodeSyntaxOptions } from "../utils/stateMachine";

const JSON_KEYWORDS = new Set(["true", "false", "null"]);

const JSON_OPTIONS: CodeSyntaxOptions = {
  keywords: JSON_KEYWORDS,
  strings: [{ start: '"', end: '"', escape: "\\" }],
  markFunctions: false
};

/**
 * 解析 JSON 单行语法高亮片段。
 *
 * @param line 当前行文本。
 * @returns 当前行高亮片段。
 */
export function jsonLineSpans(line: string): LineTextSpan[] {
  return codeLineSpans(line, JSON_OPTIONS);
}
