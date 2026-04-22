import type { LineTextSpan } from "../../../../types";
import { readQuotedString } from "../utils/scan";
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
    if (/[A-Za-z]/.test(char)) {
      const start = index;
      while (index < line.length && /[A-Za-z]/.test(line[index])) index += 1;
      if (JSON_KEYWORDS.has(line.slice(start, index))) tokens.push({ start, end: index, kind: "keyword" });
      continue;
    }
    index += 1;
  }
  return tokensToSpans(tokens, line.length);
}

