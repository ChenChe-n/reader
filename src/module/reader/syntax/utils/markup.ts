import type { LineTextSpan } from "../../../../types";
import { cssLineResult } from "../css/main";
import { JAVASCRIPT_KEYWORDS } from "../javascript/main";
import { scriptLineResult } from "../typescript/main";
import type { SlashBlockState } from "./slashBlock";
import { tokensToSpans, type SyntaxToken } from "./tokens";

export interface MarkupState {
  inComment: boolean;
  inScript?: boolean;
  inStyle?: boolean;
  inScriptBlockComment?: boolean;
  inStyleBlockComment?: boolean;
}

export interface MarkupLineResult {
  spans: LineTextSpan[];
  state: MarkupState;
}

export function markupLineResult(line: string, state: MarkupState): MarkupLineResult {
  const tokens: SyntaxToken[] = [];
  const spans: LineTextSpan[] = [];
  const nextState: MarkupState = {
    inComment: state.inComment,
    inScript: state.inScript ?? false,
    inStyle: state.inStyle ?? false,
    inScriptBlockComment: state.inScriptBlockComment ?? false,
    inStyleBlockComment: state.inStyleBlockComment ?? false
  };
  let index = 0;
  while (index < line.length) {
    if (nextState.inComment) {
      const close = line.indexOf("-->", index);
      if (close < 0) {
        tokens.push({ start: index, end: line.length, kind: "comment" });
        return { spans: mergeSpans(tokensToSpans(tokens, line.length), spans, line.length), state: nextState };
      }
      tokens.push({ start: index, end: close + 3, kind: "comment" });
      nextState.inComment = false;
      index = close + 3;
      continue;
    }
    if (nextState.inScript || nextState.inStyle) {
      const embeddedKind = nextState.inScript ? "script" : "style";
      const closeIndex = findClosingTag(line, index, embeddedKind);
      const embeddedEnd = closeIndex >= 0 ? closeIndex : line.length;
      const embeddedSegment = line.slice(index, embeddedEnd);
      if (embeddedSegment.length > 0) {
        const embeddedSpans = parseEmbeddedSpans(embeddedSegment, embeddedKind, nextState);
        for (const span of embeddedSpans) {
          spans.push({ start: span.start + index, end: span.end + index, style: span.style });
        }
      }
      if (closeIndex < 0) {
        return { spans: mergeSpans(tokensToSpans(tokens, line.length), spans, line.length), state: nextState };
      }
      const closeTagEnd = readTag(line, closeIndex);
      markTagTokens(line, closeIndex, closeTagEnd, tokens);
      if (embeddedKind === "script") nextState.inScript = false;
      else nextState.inStyle = false;
      index = closeTagEnd;
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
    if (line.startsWith("{{", index)) {
      const close = line.indexOf("}}", index + 2);
      const end = close >= 0 ? close + 2 : line.length;
      tokens.push({ start: index, end: Math.min(index + 2, end), kind: "keyword" });
      const expressionStart = Math.min(index + 2, end);
      const expressionEnd = close >= 0 ? close : end;
      if (expressionEnd > expressionStart) {
        const expressionSpans = scriptLineResult(
          line.slice(expressionStart, expressionEnd),
          JAVASCRIPT_KEYWORDS,
          { inBlockComment: false }
        ).spans;
        for (const span of expressionSpans) {
          spans.push({ start: span.start + expressionStart, end: span.end + expressionStart, style: span.style });
        }
      }
      if (close >= 0) tokens.push({ start: close, end: close + 2, kind: "keyword" });
      index = end;
      continue;
    }
    if (line[index] === "<" && looksLikeTagStart(line, index)) {
      const end = readTag(line, index);
      markTagTokens(line, index, end, tokens);
      const tagKind = openingTagKind(line, index, end);
      if (tagKind === "script") nextState.inScript = true;
      if (tagKind === "style") nextState.inStyle = true;
      index = end;
      continue;
    }
    index += 1;
  }
  return { spans: mergeSpans(tokensToSpans(tokens, line.length), spans, line.length), state: nextState };
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

function markTagTokens(line: string, start: number, end: number, tokens: SyntaxToken[]): void {
  const open = parseTagOpen(line, start, end);
  tokens.push({ start, end: Math.min(start + open.punctuationLength, end), kind: "keyword" });
  if (open.nameStart < open.nameEnd) {
    tokens.push({ start: open.nameStart, end: open.nameEnd, kind: "keyword" });
  }
  markTagAttributeTokens(line, open.nameEnd, end, tokens);
  if (line[end - 1] === ">") {
    const gtStart = end - 1;
    if (line[gtStart - 1] === "/") tokens.push({ start: gtStart - 1, end: gtStart, kind: "keyword" });
    tokens.push({ start: gtStart, end, kind: "keyword" });
  }
}

function markTagAttributeTokens(line: string, start: number, end: number, tokens: SyntaxToken[]): void {
  let index = start;
  while (index < end) {
    const char = line[index];
    if (char === '"' || char === "'") {
      const valueEnd = Math.min(readAttributeValue(line, index), end);
      tokens.push({ start: index, end: valueEnd, kind: "string" });
      index = valueEnd;
      continue;
    }
    if (/[A-Za-z_:@]/.test(char)) {
      const nameStart = index;
      index += 1;
      while (index < end && /[A-Za-z0-9_:@.-]/.test(line[index])) index += 1;
      tokens.push({ start: nameStart, end: index, kind: "function" });
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

function parseTagOpen(line: string, start: number, end: number): { punctuationLength: number; nameStart: number; nameEnd: number } {
  let cursor = start + 1;
  if (line[cursor] === "/") cursor += 1;
  while (cursor < end && /\s/.test(line[cursor])) cursor += 1;
  const nameStart = cursor;
  while (cursor < end && /[A-Za-z0-9:_-]/.test(line[cursor])) cursor += 1;
  return { punctuationLength: Math.max(nameStart - start, 1), nameStart, nameEnd: cursor };
}

function looksLikeTagStart(line: string, index: number): boolean {
  const next = line[index + 1];
  return !!next && /[A-Za-z!/?]/.test(next);
}

function openingTagKind(line: string, start: number, end: number): "script" | "style" | null {
  if (line[start + 1] === "/") return null;
  if (line[end - 2] === "/" && line[end - 1] === ">") return null;
  const open = parseTagOpen(line, start, end);
  const name = line.slice(open.nameStart, open.nameEnd).toLowerCase();
  if (name === "script") return "script";
  if (name === "style") return "style";
  return null;
}

function findClosingTag(line: string, from: number, kind: "script" | "style"): number {
  const lower = line.toLowerCase();
  return lower.indexOf(`</${kind}`, from);
}

function parseEmbeddedSpans(segment: string, kind: "script" | "style", state: MarkupState): LineTextSpan[] {
  if (kind === "script") {
    const scriptState = { inBlockComment: state.inScriptBlockComment ?? false };
    const result = scriptLineResult(segment, JAVASCRIPT_KEYWORDS, scriptState);
    state.inScriptBlockComment = result.state.inBlockComment;
    return result.spans;
  }
  const styleState: SlashBlockState = { inBlockComment: state.inStyleBlockComment ?? false };
  const result = cssLineResult(segment, styleState);
  state.inStyleBlockComment = result.state.inBlockComment;
  return result.spans;
}

function mergeSpans(primary: LineTextSpan[], secondary: LineTextSpan[], lineLength: number): LineTextSpan[] {
  const merged = [...primary, ...secondary].sort((a, b) => a.start - b.start || a.end - b.end);
  const output: LineTextSpan[] = [];
  let cursor = 0;
  for (const span of merged) {
    const start = Math.max(cursor, Math.max(0, Math.min(span.start, lineLength)));
    const end = Math.max(start, Math.max(0, Math.min(span.end, lineLength)));
    if (end <= start) continue;
    output.push({ ...span, start, end });
    cursor = end;
  }
  return output;
}

