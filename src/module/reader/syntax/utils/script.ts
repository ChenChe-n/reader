import { codeLineResult, codeLineSpans, type CodeLineResult, type CodeStringRule, type CodeSyntaxOptions, type CodeSyntaxState } from "./stateMachine";

export type ScriptSyntaxState = CodeSyntaxState;
export type ScriptLineResult = CodeLineResult;

const SCRIPT_STRINGS: readonly CodeStringRule[] = [
  { start: '"', end: '"', escape: "\\" },
  { start: "'", end: "'", escape: "\\" },
  { start: "`", end: "`", escape: "\\", multiline: true }
];

/**
 * 使用指定关键字解析脚本单行语法高亮片段。
 *
 * @param line 当前行文本。
 * @param keywords 当前语言关键字集合。
 * @returns 当前行高亮片段。
 */
export function scriptLineSpans(line: string, keywords: ReadonlySet<string>) {
  return codeLineSpans(line, scriptOptions(keywords));
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
