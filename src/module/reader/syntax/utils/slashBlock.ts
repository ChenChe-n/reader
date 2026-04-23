import type { LineTextSpan } from "../../../../types";
import { nextNonSpace, readKeywordTokenEnd, readProgramTokenEnd, readQuotedString, readTemplateString } from "./scan";
import { tokensToSpans, type SyntaxToken } from "./tokens";

export interface SlashBlockState {
  inBlockComment: boolean;
}

export interface SlashBlockResult {
  spans: LineTextSpan[];
  state: SlashBlockState;
}

export interface SlashBlockOptions {
  keywords: ReadonlySet<string>;
  lineComment?: string;
  blockStart?: string;
  blockEnd?: string;
  templateStrings?: boolean;
}

type TokenScanState = "normal" | "comment" | "function" | "string";

export function slashBlockLineResult(line: string, state: SlashBlockState, options: SlashBlockOptions): SlashBlockResult {
  const tokens: SyntaxToken[] = [];
  const nextState = { ...state };
  const lineComment = options.lineComment ?? "//";
  const blockStart = options.blockStart ?? "/*";
  const blockEnd = options.blockEnd ?? "*/";
  let index = 0;

  while (index < line.length) {
    const scanState = slashBlockTokenState(line, index, nextState, options, lineComment, blockStart);

    if (scanState === "comment") {
      const close = line.indexOf(blockEnd, index);
      if (nextState.inBlockComment) {
        if (close < 0) {
          tokens.push({ start: index, end: line.length, kind: "comment" });
          return { spans: tokensToSpans(tokens, line.length), state: nextState };
        }
        tokens.push({ start: index, end: close + blockEnd.length, kind: "comment" });
        nextState.inBlockComment = false;
        index = close + blockEnd.length;
        continue;
      }
      if (line.startsWith(lineComment, index)) {
        tokens.push({ start: index, end: line.length, kind: "comment" });
        break;
      }
      const blockClose = line.indexOf(blockEnd, index + blockStart.length);
      const end = blockClose >= 0 ? blockClose + blockEnd.length : line.length;
      tokens.push({ start: index, end, kind: "comment" });
      nextState.inBlockComment = blockClose < 0;
      index = end;
      continue;
    }

    if (scanState === "string") {
      const end = line[index] === "`" ? readTemplateString(line, index) : readQuotedString(line, index);
      tokens.push({ start: index, end, kind: "string" });
      index = end;
      continue;
    }

    const tokenEnd = readProgramTokenEnd(line, index);
    if (tokenEnd !== null) {
      if (scanState === "function") tokens.push({ start: index, end: tokenEnd, kind: "function" });
      else {
        const keywordEnd = readKeywordTokenEnd(line, index, options.keywords);
        if (keywordEnd !== null) tokens.push({ start: index, end: keywordEnd, kind: "keyword" });
      }
      index = tokenEnd;
      continue;
    }

    index += 1;
  }

  return { spans: tokensToSpans(tokens, line.length), state: nextState };
}

/**
 * 根据当前位置内容判断扫描器应进入的 token 状态。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param state 当前跨行扫描状态。
 * @param options 当前语言扫描选项。
 * @param lineComment 行注释起始符。
 * @param blockStart 块注释起始符。
 * @returns 当前位置对应的 token 状态。
 */
function slashBlockTokenState(
  line: string,
  index: number,
  state: SlashBlockState,
  options: SlashBlockOptions,
  lineComment: string,
  blockStart: string
): TokenScanState {
  if (state.inBlockComment || line.startsWith(lineComment, index) || line.startsWith(blockStart, index)) return "comment";
  const char = line[index];
  if (char === '"' || char === "'" || (options.templateStrings && char === "`")) return "string";
  const tokenEnd = readProgramTokenEnd(line, index);
  if (tokenEnd !== null && !options.keywords.has(line.slice(index, tokenEnd)) && isFunctionToken(line, tokenEnd)) return "function";
  return "normal";
}

/**
 * 判断普通 token 后方是否是允许空白间隔的函数调用或声明。
 *
 * @param line 当前行文本。
 * @param index token 结束位置。
 * @returns 如果后续第一个非空白字符是左括号则返回 true。
 */
function isFunctionToken(line: string, index: number): boolean {
  return nextNonSpace(line, index) === "(";
}
