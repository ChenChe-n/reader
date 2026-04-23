import type { LineTextSpan } from "../../../../types";
import { nextNonSpace, readIdentifierEnd, readKeywordTokenEnd, readQuotedString, readTemplateString } from "./scan";
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

export function slashBlockLineResult(line: string, state: SlashBlockState, options: SlashBlockOptions): SlashBlockResult {
  const tokens: SyntaxToken[] = [];
  const nextState = { ...state };
  const lineComment = options.lineComment ?? "//";
  const blockStart = options.blockStart ?? "/*";
  const blockEnd = options.blockEnd ?? "*/";
  let index = 0;

  while (index < line.length) {
    if (nextState.inBlockComment) {
      const close = line.indexOf(blockEnd, index);
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
    if (line.startsWith(blockStart, index)) {
      const close = line.indexOf(blockEnd, index + blockStart.length);
      const end = close >= 0 ? close + blockEnd.length : line.length;
      tokens.push({ start: index, end, kind: "comment" });
      nextState.inBlockComment = close < 0;
      index = end;
      continue;
    }

    const char = line[index];
    if (char === '"' || char === "'") {
      const end = readQuotedString(line, index);
      tokens.push({ start: index, end, kind: "string" });
      index = end;
      continue;
    }
    if (options.templateStrings && char === "`") {
      const end = readTemplateString(line, index);
      tokens.push({ start: index, end, kind: "string" });
      index = end;
      continue;
    }
    const keywordEnd = readKeywordTokenEnd(line, index, options.keywords);
    if (keywordEnd !== null) {
      tokens.push({ start: index, end: keywordEnd, kind: "keyword" });
      index = keywordEnd;
      continue;
    }
    const identifierEnd = readIdentifierEnd(line, index);
    if (identifierEnd !== null) {
      const start = index;
      index = identifierEnd;
      const word = line.slice(start, index);
      if (options.keywords.has(word)) continue;
      else if (isFunctionToken(line, index)) tokens.push({ start, end: index, kind: "function" });
      continue;
    }
    index += 1;
  }

  return { spans: tokensToSpans(tokens, line.length), state: nextState };
}

/**
 * 判断标识符后方是否是允许空白间隔的函数调用或声明。
 *
 * @param line 当前行文本。
 * @param index 标识符结束位置。
 * @returns 如果后续第一个非空白字符是左括号则返回 true。
 */
function isFunctionToken(line: string, index: number): boolean {
  return nextNonSpace(line, index) === "(";
}
