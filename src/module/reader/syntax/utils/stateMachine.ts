import type { LineTextSpan } from "../../../../types";
import { handleDelimiter, nextLastNormalToken, nextParenDepth, readNormalToken } from "./stateMachineFunction";
import { readCodeTokenEnd, readCommentToken, readStoredState, readStringToken } from "./stateMachineRead";
import {
  normalizeCodeState,
  type CodeLineResult,
  type CodeSyntaxOptions,
  type CodeSyntaxState,
  type NormalToken,
  type PendingFunction
} from "./stateMachineTypes";
import { tokensToSpans, type SyntaxToken } from "./tokens";

export {
  cppRawStringMatcher,
  syncCodeSyntaxState,
  type CodeLineResult,
  type CodeStringMatch,
  type CodeStringRule,
  type CodeSyntaxOptions,
  type CodeSyntaxState,
  type CodeTokenState
} from "./stateMachineTypes";

/**
 * 使用公共状态机解析一行代码 token。
 *
 * @param line 当前行文本。
 * @param state 上一行遗留的扫描状态。
 * @param options 当前语言的注释、字符串、关键字配置。
 * @returns 当前行高亮片段和下一行扫描状态。
 */
export function codeLineResult(line: string, state: CodeSyntaxState, options: CodeSyntaxOptions): CodeLineResult {
  const tokens: SyntaxToken[] = [];
  const nextState = normalizeCodeState(state);
  const pendingFunctions: PendingFunction[] = [];
  const markFunctions = options.markFunctions !== false;
  let lastNormalToken: NormalToken | null = null;
  let parenDepth = 0;
  let index = 0;

  while (index < line.length) {
    const handledEnd = readNonNormalToken(line, index, nextState, options, tokens);
    if (handledEnd !== null) {
      index = handledEnd;
      lastNormalToken = null;
      continue;
    }

    const tokenEnd = readCodeTokenEnd(line, index, options);
    if (tokenEnd !== null) {
      lastNormalToken = readNormalToken(line, index, tokenEnd, options, tokens);
      index = tokenEnd;
      continue;
    }

    handleDelimiter(line[index], lastNormalToken, pendingFunctions, tokens, parenDepth, markFunctions);
    parenDepth = nextParenDepth(line[index], parenDepth);
    lastNormalToken = nextLastNormalToken(line[index], lastNormalToken);
    index += 1;
  }

  return { spans: tokensToSpans(sortTokens(tokens), line.length), state: nextState };
}

/**
 * 使用公共状态机解析无跨行状态的一行代码。
 *
 * @param line 当前行文本。
 * @param options 当前语言的注释、字符串、关键字配置。
 * @returns 当前行高亮片段。
 */
export function codeLineSpans(line: string, options: CodeSyntaxOptions): LineTextSpan[] {
  return codeLineResult(line, { inBlockComment: false }, options).spans;
}

/**
 * 读取注释或字符串等非普通态 token。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param state 当前扫描状态。
 * @param options 当前语言扫描配置。
 * @param tokens 当前行 token 输出列表。
 * @returns 已消费的结束位置；当前位置是普通态则返回 null。
 */
function readNonNormalToken(line: string, index: number, state: CodeSyntaxState, options: CodeSyntaxOptions, tokens: SyntaxToken[]): number | null {
  const storedEnd = readStoredState(line, index, state, tokens);
  if (storedEnd !== null) return storedEnd;
  const commentEnd = readCommentToken(line, index, state, options, tokens);
  if (commentEnd !== null) return commentEnd;
  return readStringToken(line, index, state, options, tokens);
}

/**
 * 按位置排序 token，避免函数在右括号处回填后顺序错乱。
 *
 * @param tokens 待排序的 token 列表。
 * @returns 排序后的 token 列表。
 */
function sortTokens(tokens: SyntaxToken[]): SyntaxToken[] {
  return tokens.sort((left, right) => left.start - right.start || left.end - right.end);
}
