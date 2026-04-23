import type { LineTextSpan } from "../../../../types";
import { hashLineResult, hashLineSpans, type HashLineResult, type HashLineState } from "../utils/hashLine";
export type { HashLineResult, HashLineState } from "../utils/hashLine";

const PYTHON_KEYWORDS = new Set([
  "False",
  "None",
  "True",
  "and",
  "as",
  "assert",
  "async",
  "await",
  "break",
  "class",
  "continue",
  "def",
  "del",
  "elif",
  "else",
  "except",
  "finally",
  "for",
  "from",
  "global",
  "if",
  "import",
  "in",
  "is",
  "lambda",
  "nonlocal",
  "not",
  "or",
  "pass",
  "raise",
  "return",
  "try",
  "while",
  "with",
  "yield"
]);

/**
 * 解析 Python 单行语法高亮片段。
 *
 * @param line 当前行文本。
 * @returns 当前行高亮片段。
 */
export function pythonLineSpans(line: string): LineTextSpan[] {
  return hashLineSpans(line, PYTHON_KEYWORDS);
}

/**
 * 解析 Python 单行语法高亮片段和跨行状态。
 *
 * @param line 当前行文本。
 * @param state 上一行遗留的扫描状态。
 * @returns 当前行高亮片段和下一行扫描状态。
 */
export function pythonLineResult(line: string, state: HashLineState): HashLineResult {
  return hashLineResult(line, state, PYTHON_KEYWORDS);
}
