import type { LineTextSpan } from "../../../../types";
import { nextNonSpace, readKeywordTokenEnd, readProgramTokenEnd, readQuotedString, readTemplateString } from "../utils/scan";
import { tokensToSpans, type SyntaxToken } from "../utils/tokens";

export interface ScriptSyntaxState {
  inBlockComment: boolean;
}

export interface ScriptLineResult {
  spans: LineTextSpan[];
  state: ScriptSyntaxState;
}

type TokenScanState = "normal" | "comment" | "function" | "string";

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
    const scanState = scriptTokenState(line, index, keywords, nextState);

    if (scanState === "comment") {
      const close = line.indexOf("*/", index);
      if (nextState.inBlockComment) {
        if (close < 0) {
          tokens.push({ start: index, end: line.length, kind: "comment" });
          return { spans: tokensToSpans(tokens, line.length), state: nextState };
        }
        tokens.push({ start: index, end: close + 2, kind: "comment" });
        nextState.inBlockComment = false;
        index = close + 2;
        continue;
      }
      if (line[index + 1] === "/") {
        tokens.push({ start: index, end: line.length, kind: "comment" });
        break;
      }
      const blockClose = line.indexOf("*/", index + 2);
      const end = blockClose >= 0 ? blockClose + 2 : line.length;
      tokens.push({ start: index, end, kind: "comment" });
      nextState.inBlockComment = blockClose < 0;
      index = end;
      continue;
    }

    if (scanState === "string") {
      const end = line[index] === "`" ? readTemplateString(line, index) : readQuotedString(line, index);
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
  return { spans: tokensToSpans(tokens, line.length), state: nextState };
}

/**
 * 根据当前位置内容判断脚本扫描器的 token 状态。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @param keywords 可匹配的关键字集合。
 * @param state 当前跨行扫描状态。
 * @returns 当前位置对应的 token 状态。
 */
function scriptTokenState(line: string, index: number, keywords: ReadonlySet<string>, state: ScriptSyntaxState): TokenScanState {
  if (state.inBlockComment || (line[index] === "/" && (line[index + 1] === "/" || line[index + 1] === "*"))) return "comment";
  if (line[index] === '"' || line[index] === "'" || line[index] === "`") return "string";
  const tokenEnd = readProgramTokenEnd(line, index);
  if (tokenEnd !== null && !keywords.has(line.slice(index, tokenEnd)) && nextNonSpace(line, tokenEnd) === "(") return "function";
  return "normal";
}
