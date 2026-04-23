import type { LineTextSpan } from "../../../../types";
import { codeLineSpans, type CodeStringRule, type CodeSyntaxOptions } from "./stateMachine";

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
