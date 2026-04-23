import type { SyntaxToken } from "./tokens";
import type { CodeStringMatch, CodeSyntaxOptions, CodeSyntaxState } from "./stateMachineTypes";

/**
 * 读取上一行延续下来的字符串。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param state 当前扫描状态。
 * @param tokens 当前行 token 输出列表。
 * @returns 已消费的结束位置。
 */
export function readStoredString(line: string, index: number, state: CodeSyntaxState, tokens: SyntaxToken[]): number {
  const end = findStringEnd(line, index, state.stringEnd ?? "", state.stringEscape ?? null);
  tokens.push({ start: index, end, kind: "string" });
  if (end < line.length) clearStringState(state);
  return end;
}

/**
 * 读取当前位置开始的字符串 token。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param state 当前扫描状态。
 * @param options 当前语言扫描配置。
 * @param tokens 当前行 token 输出列表。
 * @returns 已消费的结束位置；未命中字符串则返回 null。
 */
export function readStringToken(line: string, index: number, state: CodeSyntaxState, options: CodeSyntaxOptions, tokens: SyntaxToken[]): number | null {
  const match = matchStringStart(line, index, options);
  if (!match) return null;
  const end = findStringEnd(line, index + match.startLength, match.end, match.escape ?? null);
  tokens.push({ start: index, end, kind: "string" });
  if (end >= line.length && match.multiline) setStringState(state, match);
  return end;
}

/**
 * 判断当前位置是否开始字符串。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param options 当前语言扫描配置。
 * @returns 命中字符串则返回 true。
 */
export function startsStringToken(line: string, index: number, options: CodeSyntaxOptions): boolean {
  return matchStringStart(line, index, options) !== null;
}

/**
 * 判断当前位置是否开始字符串。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param options 当前语言扫描配置。
 * @returns 命中的字符串配置；没有命中则返回 null。
 */
function matchStringStart(line: string, index: number, options: CodeSyntaxOptions): CodeStringMatch | null {
  for (const matcher of options.stringMatchers ?? []) {
    const match = matcher(line, index);
    if (match) return match;
  }
  const rule = options.strings?.find(value => value.start && line.startsWith(value.start, index));
  return rule ? { startLength: rule.start.length, end: rule.end, escape: rule.escape ?? null, multiline: rule.multiline ?? false } : null;
}

/**
 * 读取字符串结束位置，支持转义符跳过结束符。
 *
 * @param line 当前行文本。
 * @param start 字符串内容起始位置。
 * @param endMark 字符串结束符。
 * @param escape 转义符；没有转义规则时传 null。
 * @returns 字符串 token 结束位置。
 */
function findStringEnd(line: string, start: number, endMark: string, escape: string | null): number {
  let index = start;
  while (index < line.length) {
    if (escape && line.startsWith(escape, index)) {
      index += escape.length + 1;
      continue;
    }
    if (line.startsWith(endMark, index)) return index + endMark.length;
    index += 1;
  }
  return line.length;
}

/**
 * 记录跨行字符串状态。
 *
 * @param state 当前扫描状态。
 * @param match 当前字符串匹配配置。
 * @returns 无返回值。
 */
function setStringState(state: CodeSyntaxState, match: CodeStringMatch): void {
  state.stringEnd = match.end;
  state.stringEscape = match.escape ?? null;
  state.stringMultiline = Boolean(match.multiline);
}

/**
 * 清理跨行字符串状态。
 *
 * @param state 当前扫描状态。
 * @returns 无返回值。
 */
function clearStringState(state: CodeSyntaxState): void {
  state.stringEnd = null;
  state.stringEscape = null;
  state.stringMultiline = false;
}
