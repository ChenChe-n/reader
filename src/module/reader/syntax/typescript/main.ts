import type { LineTextSpan } from "../../../../types";
import { scriptLineResult, scriptLineSpans, type ScriptLineResult, type ScriptSyntaxState } from "../utils/script";
export type { ScriptLineResult, ScriptSyntaxState } from "../utils/script";

const TYPESCRIPT_KEYWORDS = new Set([
  "abstract",
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield"
]);

/**
 * 解析 TypeScript 单行语法高亮片段。
 *
 * @param line 当前行文本。
 * @returns 当前行高亮片段。
 */
export function typescriptLineSpans(line: string): LineTextSpan[] {
  return scriptLineSpans(line, TYPESCRIPT_KEYWORDS);
}

/**
 * 解析 TypeScript 单行语法高亮片段和跨行状态。
 *
 * @param line 当前行文本。
 * @param state 上一行遗留的扫描状态。
 * @returns 当前行高亮片段和下一行扫描状态。
 */
export function typescriptLineResult(line: string, state: ScriptSyntaxState): ScriptLineResult {
  return scriptLineResult(line, TYPESCRIPT_KEYWORDS, state);
}
