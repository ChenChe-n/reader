import type { LineTextSpan } from "../../../../types";
import { readKeywordTokenEnd, readQuotedString } from "../utils/scan";
import { tokensToSpans, type SyntaxToken } from "../utils/tokens";

const JSON_KEYWORDS = new Set(["true", "false", "null"]);

export function jsonLineSpans(line: string): LineTextSpan[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  while (index < line.length) {
    const char = line[index];
    if (char === '"') {
      const end = readQuotedString(line, index);
      tokens.push({ start: index, end, kind: "string" });
      index = end;
      continue;
    }
    const keywordEnd = readKeywordTokenEnd(line, index, JSON_KEYWORDS);
    if (keywordEnd !== null) {
      tokens.push({ start: index, end: keywordEnd, kind: "keyword" });
      index = keywordEnd;
      continue;
    }
    if (/[A-Za-z]/.test(char)) {
      while (index < line.length && /[A-Za-z]/.test(line[index])) index += 1;
      continue;
    }
    index += 1;
  }
  return tokensToSpans(tokens, line.length);
}
