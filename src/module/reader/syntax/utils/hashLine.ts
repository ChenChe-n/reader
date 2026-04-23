import type { LineTextSpan } from "../../../../types";
import { nextNonSpace, readIdentifierEnd, readKeywordTokenEnd, readQuotedString } from "./scan";
import { tokensToSpans, type SyntaxToken } from "./tokens";

export function hashLineSpans(line: string, keywords: ReadonlySet<string>): LineTextSpan[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    if (char === "#") {
      tokens.push({ start: index, end: line.length, kind: "comment" });
      break;
    }
    if (char === '"' || char === "'") {
      const quote = char;
      const triple = line.slice(index, index + 3) === quote.repeat(3);
      const end = triple ? readTripleQuotedString(line, index, quote) : readQuotedString(line, index);
      tokens.push({ start: index, end, kind: "string" });
      index = end;
      continue;
    }
    const keywordEnd = readKeywordTokenEnd(line, index, keywords);
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
      if (keywords.has(word)) continue;
      else if (nextNonSpace(line, index) === "(") tokens.push({ start, end: index, kind: "function" });
      continue;
    }
    index += 1;
  }
  return tokensToSpans(tokens, line.length);
}

function readTripleQuotedString(line: string, start: number, quote: string): number {
  const close = line.indexOf(quote.repeat(3), start + 3);
  return close >= 0 ? close + 3 : line.length;
}
