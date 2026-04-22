import type { LineTextSpan } from "../../../../types";
import { isIdentifierPart, isIdentifierStart, nextNonSpace, readQuotedString, readTemplateString } from "./scan";
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
  functionPattern?: "call" | "declaration";
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
    if (isIdentifierStart(char)) {
      const start = index;
      index += 1;
      while (index < line.length && isIdentifierPart(line[index])) index += 1;
      const word = line.slice(start, index);
      if (options.keywords.has(word)) tokens.push({ start, end: index, kind: "keyword" });
      else if (isFunctionToken(line, index, options.functionPattern ?? "call")) tokens.push({ start, end: index, kind: "function" });
      continue;
    }
    index += 1;
  }

  return { spans: tokensToSpans(tokens, line.length), state: nextState };
}

function isFunctionToken(line: string, index: number, pattern: "call" | "declaration"): boolean {
  if (nextNonSpace(line, index) !== "(") return false;
  if (pattern === "call") return true;
  return /\b[A-Za-z_][A-Za-z0-9_<>,\s:*&]*\s+$/.test(line.slice(0, index));
}

