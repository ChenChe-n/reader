import { isProgramTokenBoundary } from "./scan";
import { readStoredString, readStringToken, startsStringToken } from "./stateMachineString";
import type { SyntaxToken } from "./tokens";
import type { CodeStringRule, CodeSyntaxOptions, CodeSyntaxState } from "./stateMachineTypes";

export { readStringToken } from "./stateMachineString";

/**
 * 读取上一行延续下来的注释或字符串状态。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param state 当前扫描状态。
 * @param tokens 当前行 token 输出列表。
 * @returns 已消费的结束位置；没有延续状态则返回 null。
 */
export function readStoredState(line: string, index: number, state: CodeSyntaxState, tokens: SyntaxToken[]): number | null {
  if (state.inBlockComment) return readStoredBlockComment(line, index, state, tokens);
  if (state.stringEnd) return readStoredString(line, index, state, tokens);
  return null;
}

/**
 * 读取当前位置开始的注释 token。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param state 当前扫描状态。
 * @param options 当前语言扫描配置。
 * @param tokens 当前行 token 输出列表。
 * @returns 已消费的结束位置；未命中注释则返回 null。
 */
export function readCommentToken(line: string, index: number, state: CodeSyntaxState, options: CodeSyntaxOptions, tokens: SyntaxToken[]): number | null {
  if (startsLineComment(line, index, options)) {
    tokens.push({ start: index, end: line.length, kind: "comment" });
    return line.length;
  }

  const blockComment = matchBlockComment(line, index, options);
  if (!blockComment) return null;
  const close = line.indexOf(blockComment.end, index + blockComment.start.length);
  const end = close >= 0 ? close + blockComment.end.length : line.length;
  tokens.push({ start: index, end, kind: "comment" });
  state.inBlockComment = close < 0;
  state.blockCommentEnd = state.inBlockComment ? blockComment.end : null;
  return end;
}

/**
 * 读取当前语言配置下的普通文本 token 结束位置。
 *
 * @param line 当前行文本。
 * @param start token 起始位置。
 * @param options 当前语言扫描配置。
 * @returns 可形成 token 时返回结束位置，否则返回 null。
 */
export function readCodeTokenEnd(line: string, start: number, options: CodeSyntaxOptions): number | null {
  if (isCodeTokenBoundary(line, start, options)) return null;
  let index = start + 1;
  while (index < line.length && !isCodeTokenBoundary(line, index, options)) index += 1;
  return index;
}

/**
 * 判断当前位置是否是当前语言配置下的 token 边界。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param options 当前语言扫描配置。
 * @returns 如果当前位置会切断普通 token 则返回 true。
 */
function isCodeTokenBoundary(line: string, index: number, options: CodeSyntaxOptions): boolean {
  const char = line[index] ?? "";
  if (!char || isProgramTokenBoundary(char)) return true;
  return startsLineComment(line, index, options) || Boolean(matchBlockComment(line, index, options)) || startsStringToken(line, index, options);
}

/**
 * 读取上一行延续下来的块注释。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param state 当前扫描状态。
 * @param tokens 当前行 token 输出列表。
 * @returns 已消费的结束位置。
 */
function readStoredBlockComment(line: string, index: number, state: CodeSyntaxState, tokens: SyntaxToken[]): number {
  const endMark = state.blockCommentEnd ?? "*/";
  const close = line.indexOf(endMark, index);
  const end = close >= 0 ? close + endMark.length : line.length;
  tokens.push({ start: index, end, kind: "comment" });
  state.inBlockComment = close < 0;
  if (!state.inBlockComment) state.blockCommentEnd = null;
  return end;
}

/**
 * 判断当前位置是否开始行注释。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param options 当前语言扫描配置。
 * @returns 命中行注释则返回 true。
 */
function startsLineComment(line: string, index: number, options: CodeSyntaxOptions): boolean {
  return Boolean(options.lineComments?.some(comment => comment && line.startsWith(comment, index)));
}

/**
 * 判断当前位置是否开始块注释。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param options 当前语言扫描配置。
 * @returns 命中的块注释配置；没有命中则返回 null。
 */
function matchBlockComment(line: string, index: number, options: CodeSyntaxOptions): CodeStringRule | null {
  return options.blockComments?.find(comment => comment.start && line.startsWith(comment.start, index)) ?? null;
}
