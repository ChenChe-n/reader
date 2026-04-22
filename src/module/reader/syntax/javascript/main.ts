import type { LineTextSpan } from "../../../../types";
import { scriptLineResult, scriptLineSpans, type ScriptLineResult, type ScriptSyntaxState } from "../typescript/main";

export const JAVASCRIPT_KEYWORDS = new Set([
  "async",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "from",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "null",
  "return",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield"
]);

export function javascriptLineSpans(line: string): LineTextSpan[] {
  return scriptLineSpans(line, JAVASCRIPT_KEYWORDS);
}

export function javascriptLineResult(line: string, state: ScriptSyntaxState): ScriptLineResult {
  return scriptLineResult(line, JAVASCRIPT_KEYWORDS, state);
}
