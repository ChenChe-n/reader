import type { LineTextSpan } from "../../../../types";
import { tokensToSpans, type SyntaxToken } from "./tokens";

export interface MarkupState {
  inComment: boolean;
}

export interface MarkupLineResult {
  spans: LineTextSpan[];
  state: MarkupState;
}

export function markupLineResult(line: string, state: MarkupState): MarkupLineResult {
  const tokens: SyntaxToken[] = [];
  const nextState = { ...state };
  let index = 0;
  while (index < line.length) {
    if (nextState.inComment) {
      const close = line.indexOf("-->", index);
      if (close < 0) {
        tokens.push({ start: index, end: line.length, kind: "comment" });
        return { spans: tokensToSpans(tokens, line.length), state: nextState };
      }
      tokens.push({ start: index, end: close + 3, kind: "comment" });
      nextState.inComment = false;
      index = close + 3;
      continue;
    }
    if (line.startsWith("<!--", index)) {
      const close = line.indexOf("-->", index + 4);
      const end = close >= 0 ? close + 3 : line.length;
      tokens.push({ start: index, end, kind: "comment" });
      nextState.inComment = close < 0;
      index = end;
      continue;
    }
    if (line[index] === "<") {
      const end = readTag(line, index);
      tokens.push({ start: index, end: Math.min(index + tagNameLength(line, index), end), kind: "keyword" });
      markQuotedAttributes(line, index, end, tokens);
      index = end;
      continue;
    }
    index += 1;
  }
  return { spans: tokensToSpans(tokens, line.length), state: nextState };
}

function readTag(line: string, start: number): number {
  let index = start + 1;
  while (index < line.length) {
    const char = line[index];
    if (char === '"' || char === "'") {
      index = readAttributeValue(line, index);
      continue;
    }
    index += 1;
    if (char === ">") break;
  }
  return index;
}

function tagNameLength(line: string, start: number): number {
  let index = start + 1;
  if (line[index] === "/") index += 1;
  while (index < line.length && /[A-Za-z0-9:_-]/.test(line[index])) index += 1;
  return Math.max(index - start, 1);
}

function markQuotedAttributes(line: string, start: number, end: number, tokens: SyntaxToken[]): void {
  let index = start + 1;
  while (index < end) {
    const char = line[index];
    if (char === '"' || char === "'") {
      const valueEnd = readAttributeValue(line, index);
      tokens.push({ start: index, end: Math.min(valueEnd, end), kind: "string" });
      index = valueEnd;
      continue;
    }
    index += 1;
  }
}

function readAttributeValue(line: string, start: number): number {
  const quote = line[start];
  let index = start + 1;
  while (index < line.length) {
    const char = line[index];
    index += 1;
    if (char === quote) break;
  }
  return index;
}

