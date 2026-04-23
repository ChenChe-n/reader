import type { LineTextSpan } from "../../../../types";
import { nextNonSpace, readKeywordTokenEnd, readProgramTokenEnd, readQuotedString } from "./scan";
import { tokensToSpans, type SyntaxToken } from "./tokens";

type TokenScanState = "normal" | "comment" | "function" | "string";

export function hashLineSpans(line: string, keywords: ReadonlySet<string>): LineTextSpan[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  while (index < line.length) {
    const scanState = hashLineTokenState(line, index, keywords);

    if (scanState === "comment") {
      tokens.push({ start: index, end: line.length, kind: "comment" });
      break;
    }

    if (scanState === "string") {
      const quote = line[index];
      const triple = line.slice(index, index + 3) === quote.repeat(3);
      const end = triple ? readTripleQuotedString(line, index, quote) : readQuotedString(line, index);
      tokens.push({ start: index, end, kind: "string" });
      index = end;
      continue;
    }

    const tokenEnd = readProgramTokenEnd(line, index);
    if (tokenEnd !== null) {
      if (scanState === "function") tokens.push({ start: index, end: tokenEnd, kind: "function" });
      else {
        const keywordEnd = readKeywordTokenEnd(line, index, keywords);
        if (keywordEnd !== null) tokens.push({ start: index, end: keywordEnd, kind: "keyword" });
      }
      index = tokenEnd;
      continue;
    }

    index += 1;
  }
  return tokensToSpans(tokens, line.length);
}

/**
 * 根据当前位置内容判断井号注释语言的 token 状态。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param keywords 可匹配的关键字集合。
 * @returns 当前位置对应的 token 状态。
 */
function hashLineTokenState(line: string, index: number, keywords: ReadonlySet<string>): TokenScanState {
  if (line[index] === "#") return "comment";
  if (line[index] === '"' || line[index] === "'") return "string";
  const tokenEnd = readProgramTokenEnd(line, index);
  if (tokenEnd !== null && !keywords.has(line.slice(index, tokenEnd)) && nextNonSpace(line, tokenEnd) === "(") return "function";
  return "normal";
}

function readTripleQuotedString(line: string, start: number, quote: string): number {
  const close = line.indexOf(quote.repeat(3), start + 3);
  return close >= 0 ? close + 3 : line.length;
}
