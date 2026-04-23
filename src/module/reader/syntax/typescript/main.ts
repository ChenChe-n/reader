import type { LineTextSpan } from "../../../../types";
import { nextNonSpace, readIdentifierEnd, readKeywordTokenEnd, readQuotedString, readTemplateString } from "../utils/scan";
import { tokensToSpans, type SyntaxToken } from "../utils/tokens";

export interface ScriptSyntaxState {
  inBlockComment: boolean;
}

export interface ScriptLineResult {
  spans: LineTextSpan[];
  state: ScriptSyntaxState;
}

const TYPESCRIPT_KEYWORDS = new Set([
  "abstract",
  "as",
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "private",
  "protected",
  "public",
  "readonly",
  "return",
  "satisfies",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "type",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield"
]);

export function typescriptLineSpans(line: string): LineTextSpan[] {
  return scriptLineResult(line, TYPESCRIPT_KEYWORDS, { inBlockComment: false }).spans;
}

export function scriptLineSpans(line: string, keywords: ReadonlySet<string>): LineTextSpan[] {
  return scriptLineResult(line, keywords, { inBlockComment: false }).spans;
}

export function typescriptLineResult(line: string, state: ScriptSyntaxState): ScriptLineResult {
  return scriptLineResult(line, TYPESCRIPT_KEYWORDS, state);
}

export function scriptLineResult(line: string, keywords: ReadonlySet<string>, state: ScriptSyntaxState): ScriptLineResult {
  const tokens: SyntaxToken[] = [];
  const nextState = { ...state };
  let index = 0;
  while (index < line.length) {
    if (nextState.inBlockComment) {
      const close = line.indexOf("*/", index);
      if (close < 0) {
        tokens.push({ start: index, end: line.length, kind: "comment" });
        return { spans: tokensToSpans(tokens, line.length), state: nextState };
      }
      tokens.push({ start: index, end: close + 2, kind: "comment" });
      nextState.inBlockComment = false;
      index = close + 2;
      continue;
    }
    const char = line[index];
    const next = line[index + 1];
    if (char === "/" && next === "/") {
      tokens.push({ start: index, end: line.length, kind: "comment" });
      break;
    }
    if (char === "/" && next === "*") {
      const close = line.indexOf("*/", index + 2);
      const end = close >= 0 ? close + 2 : line.length;
      tokens.push({ start: index, end, kind: "comment" });
      nextState.inBlockComment = close < 0;
      index = end;
      continue;
    }
    if (char === '"' || char === "'") {
      const end = readQuotedString(line, index);
      tokens.push({ start: index, end, kind: "string" });
      index = end;
      continue;
    }
    if (char === "`") {
      const end = readTemplateString(line, index);
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
  return { spans: tokensToSpans(tokens, line.length), state: nextState };
}
