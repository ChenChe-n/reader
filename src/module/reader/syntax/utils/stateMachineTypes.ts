import type { LineTextSpan } from "../../../../types";

export type CodeTokenState = "normal" | "comment" | "function" | "string";

export interface CodeSyntaxState {
  inBlockComment: boolean;
  blockCommentEnd?: string | null;
  stringEnd?: string | null;
  stringEscape?: string | null;
  stringMultiline?: boolean;
}

export interface CodeLineResult {
  spans: LineTextSpan[];
  state: CodeSyntaxState;
}

export interface CodeStringMatch {
  startLength: number;
  end: string;
  escape?: string | null;
  multiline?: boolean;
}

export interface CodeStringRule {
  start: string;
  end: string;
  escape?: string | null;
  multiline?: boolean;
}

export interface CodeSyntaxOptions {
  keywords: ReadonlySet<string>;
  lineComments?: readonly string[];
  blockComments?: readonly CodeStringRule[];
  strings?: readonly CodeStringRule[];
  stringMatchers?: readonly ((line: string, index: number) => CodeStringMatch | null)[];
  markFunctions?: boolean;
}

export interface NormalToken {
  start: number;
  end: number;
}

export interface PendingFunction {
  depth: number;
  token: NormalToken;
}

/**
 * 创建完整的代码扫描状态，补齐旧调用方没有提供的字段。
 *
 * @param state 外部传入的扫描状态。
 * @returns 可安全写入的扫描状态副本。
 */
export function normalizeCodeState(state: CodeSyntaxState): CodeSyntaxState {
  return {
    inBlockComment: state.inBlockComment,
    blockCommentEnd: state.blockCommentEnd ?? null,
    stringEnd: state.stringEnd ?? null,
    stringEscape: state.stringEscape ?? null,
    stringMultiline: state.stringMultiline ?? false
  };
}

/**
 * 同步公共代码扫描状态，清理已经结束的跨行字符串或注释字段。
 *
 * @param target 要更新的状态对象。
 * @param source 最新扫描结果状态。
 * @returns 无返回值。
 */
export function syncCodeSyntaxState(target: CodeSyntaxState, source: CodeSyntaxState): void {
  target.inBlockComment = source.inBlockComment;
  target.blockCommentEnd = source.blockCommentEnd ?? null;
  target.stringEnd = source.stringEnd ?? null;
  target.stringEscape = source.stringEscape ?? null;
  target.stringMultiline = source.stringMultiline ?? false;
}

/**
 * 构造 C++ 原样字符串匹配器，支持 R"tag(...)tag"。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @returns 命中时返回字符串匹配配置，否则返回 null。
 */
export function cppRawStringMatcher(line: string, index: number): CodeStringMatch | null {
  const match = /^R"([A-Za-z_0-9]{0,16})\(/.exec(line.slice(index));
  if (!match) return null;
  return { startLength: match[0].length, end: `)${match[1]}"`, escape: null, multiline: true };
}
