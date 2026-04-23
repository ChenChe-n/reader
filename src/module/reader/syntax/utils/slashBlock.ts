import type { LineTextSpan } from "../../../../types";
import { codeLineResult, type CodeLineResult, type CodeStringRule, type CodeSyntaxOptions, type CodeSyntaxState } from "./stateMachine";

export type SlashBlockState = CodeSyntaxState;
export type SlashBlockResult = CodeLineResult;

export interface SlashBlockOptions {
  keywords: ReadonlySet<string>;
  lineComment?: string;
  blockStart?: string;
  blockEnd?: string;
  templateStrings?: boolean;
  strings?: readonly CodeStringRule[];
  stringMatchers?: CodeSyntaxOptions["stringMatchers"];
}

const DEFAULT_STRINGS: readonly CodeStringRule[] = [
  { start: '"', end: '"', escape: "\\" },
  { start: "'", end: "'", escape: "\\" }
];

/**
 * 使用公共状态机解析类 C 块注释语法的一行文本。
 *
 * @param line 当前行文本。
 * @param state 上一行遗留的扫描状态。
 * @param options 当前语言关键字和语法符号配置。
 * @returns 当前行高亮片段和下一行扫描状态。
 */
export function slashBlockLineResult(line: string, state: SlashBlockState, options: SlashBlockOptions): SlashBlockResult {
  return codeLineResult(line, state, slashBlockOptions(options));
}

/**
 * 使用公共状态机解析无跨行状态的一行文本。
 *
 * @param line 当前行文本。
 * @param options 当前语言关键字和语法符号配置。
 * @returns 当前行高亮片段。
 */
export function slashBlockLineSpans(line: string, options: SlashBlockOptions): LineTextSpan[] {
  return slashBlockLineResult(line, { inBlockComment: false }, options).spans;
}

/**
 * 将类 C 扫描配置转换为公共状态机配置。
 *
 * @param options 类 C 扫描配置。
 * @returns 公共状态机配置。
 */
function slashBlockOptions(options: SlashBlockOptions): CodeSyntaxOptions {
  return {
    keywords: options.keywords,
    lineComments: lineCommentList(options.lineComment),
    blockComments: [{ start: options.blockStart ?? "/*", end: options.blockEnd ?? "*/" }],
    strings: stringList(options),
    stringMatchers: options.stringMatchers
  };
}

/**
 * 根据行注释配置生成公共状态机行注释列表。
 *
 * @param lineComment 行注释起始符。
 * @returns 行注释列表。
 */
function lineCommentList(lineComment: string | undefined): readonly string[] {
  if (lineComment === "\u0000") return [];
  return [lineComment ?? "//"];
}

/**
 * 根据字符串配置生成公共状态机字符串列表。
 *
 * @param options 类 C 扫描配置。
 * @returns 字符串配置列表。
 */
function stringList(options: SlashBlockOptions): readonly CodeStringRule[] {
  const base = options.strings ?? DEFAULT_STRINGS;
  return options.templateStrings ? [...base, { start: "`", end: "`", escape: "\\", multiline: true }] : base;
}
