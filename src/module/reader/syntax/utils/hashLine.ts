import type { LineTextSpan } from "../../../../types";
import { codeLineResult, codeLineSpans, type CodeLineResult, type CodeStringRule, type CodeSyntaxOptions, type CodeSyntaxState } from "./stateMachine";

export type HashLineState = CodeSyntaxState;
export type HashLineResult = CodeLineResult;

const HASH_STRINGS: readonly CodeStringRule[] = [
  { start: '"""', end: '"""', escape: "\\", multiline: true },
  { start: "'''", end: "'''", escape: "\\", multiline: true },
  { start: '"', end: '"', escape: "\\" },
  { start: "'", end: "'", escape: "\\" }
];

/**
 * 使用公共状态机解析井号注释语言的单行语法高亮片段。
 *
 * @param line 当前行文本。
 * @param keywords 当前语言关键字集合。
 * @returns 当前行高亮片段。
 */
export function hashLineSpans(line: string, keywords: ReadonlySet<string>): LineTextSpan[] {
  return codeLineSpans(line, hashLineOptions(keywords));
}

/**
 * 使用公共状态机解析井号注释语言的单行语法高亮片段和跨行状态。
 *
 * @param line 当前行文本。
 * @param state 上一行遗留的扫描状态。
 * @param keywords 当前语言关键字集合。
 * @returns 当前行高亮片段和下一行扫描状态。
 */
export function hashLineResult(line: string, state: HashLineState, keywords: ReadonlySet<string>): HashLineResult {
  return codeLineResult(line, state, hashLineOptions(keywords));
}

/**
 * 生成井号注释语言的公共状态机配置。
 *
 * @param keywords 当前语言关键字集合。
 * @returns 公共状态机配置。
 */
function hashLineOptions(keywords: ReadonlySet<string>): CodeSyntaxOptions {
  return {
    keywords,
    lineComments: ["#"],
    strings: HASH_STRINGS
  };
}
