import type { LineTextSpan } from "../../../../types";
import { slashBlockLineResult, type SlashBlockResult, type SlashBlockState } from "../utils/slashBlock";
import type { CodeStringRule } from "../utils/stateMachine";

const JAVA_KEYWORDS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "void",
  "volatile",
  "while"
]);

const JAVA_STRINGS: readonly CodeStringRule[] = [
  { start: '"""', end: '"""', escape: "\\", multiline: true },
  { start: '"', end: '"', escape: "\\" },
  { start: "'", end: "'", escape: "\\" }
];

/**
 * 解析 Java 单行语法高亮片段。
 *
 * @param line 当前行文本。
 * @returns 当前行高亮片段。
 */
export function javaLineSpans(line: string): LineTextSpan[] {
  return javaLineResult(line, { inBlockComment: false }).spans;
}

/**
 * 解析 Java 单行语法高亮片段和跨行状态。
 *
 * @param line 当前行文本。
 * @param state 上一行遗留的扫描状态。
 * @returns 当前行高亮片段和下一行扫描状态。
 */
export function javaLineResult(line: string, state: SlashBlockState): SlashBlockResult {
  return slashBlockLineResult(line, state, { keywords: JAVA_KEYWORDS, strings: JAVA_STRINGS });
}
