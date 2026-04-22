import type { LineTextSpan } from "../../../../types";

export type SyntaxTokenKind = "comment" | "keyword" | "function" | "string";

export interface SyntaxToken {
  start: number;
  end: number;
  kind: SyntaxTokenKind;
}

const TOKEN_COLOR: Record<SyntaxTokenKind, string> = {
  comment: "var(--syntax-comment)",
  keyword: "var(--syntax-keyword)",
  function: "var(--syntax-function)",
  string: "var(--syntax-string)"
};

export function tokenToSpan(token: SyntaxToken): LineTextSpan {
  return {
    start: token.start,
    end: token.end,
    style: { color: TOKEN_COLOR[token.kind] }
  };
}

export function tokensToSpans(tokens: SyntaxToken[], lineLength: number): LineTextSpan[] {
  const spans: LineTextSpan[] = [];
  let cursor = 0;
  for (const token of tokens) {
    const start = clampTokenIndex(token.start, lineLength);
    const end = clampTokenIndex(token.end, lineLength);
    if (end <= start || start < cursor) continue;
    spans.push(tokenToSpan({ ...token, start, end }));
    cursor = end;
  }
  return spans;
}

function clampTokenIndex(value: number, lineLength: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.trunc(value), lineLength));
}

