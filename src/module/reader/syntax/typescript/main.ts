import type { LineTextSpan } from "../../../../types";
import { codeLineResult, codeLineSpans, type CodeLineResult, type CodeStringRule, type CodeSyntaxOptions, type CodeSyntaxState } from "../utils/stateMachine";

export type ScriptSyntaxState = CodeSyntaxState;
export type ScriptLineResult = CodeLineResult;

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

const SCRIPT_STRINGS: readonly CodeStringRule[] = [
  { start: '"', end: '"', escape: "\\" },
  { start: "'", end: "'", escape: "\\" },
  { start: "`", end: "`", escape: "\\", multiline: true }
];

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
 * 使用指定关键字解析脚本单行语法高亮片段。
 *
 * @param line 当前行文本。
 * @param keywords 当前语言关键字集合。
 * @returns 当前行高亮片段。
 */
export function scriptLineSpans(line: string, keywords: ReadonlySet<string>): LineTextSpan[] {
  return codeLineSpans(line, scriptOptions(keywords));
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

/**
 * 使用指定关键字解析脚本单行语法高亮片段和跨行状态。
 *
 * @param line 当前行文本。
 * @param keywords 当前语言关键字集合。
 * @param state 上一行遗留的扫描状态。
 * @returns 当前行高亮片段和下一行扫描状态。
 */
export function scriptLineResult(line: string, keywords: ReadonlySet<string>, state: ScriptSyntaxState): ScriptLineResult {
  return codeLineResult(line, state, scriptOptions(keywords));
}

/**
 * 生成脚本语言的公共状态机配置。
 *
 * @param keywords 当前语言关键字集合。
 * @returns 公共状态机配置。
 */
function scriptOptions(keywords: ReadonlySet<string>): CodeSyntaxOptions {
  return {
    keywords,
    lineComments: ["//"],
    blockComments: [{ start: "/*", end: "*/" }],
    strings: SCRIPT_STRINGS
  };
}
