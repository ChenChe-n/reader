import type { LineTextSpan } from "../../../../types";
import { slashBlockLineResult, type SlashBlockResult, type SlashBlockState } from "../utils/slashBlock";

const JAVA_KEYWORDS = new Set([
  "abstract",
  "assert",
  "boolean",
  "break",
  "byte",
  "case",
  "catch",
  "char",
  "class",
  "const",
  "continue",
  "default",
  "do",
  "double",
  "else",
  "enum",
  "extends",
  "false",
  "final",
  "finally",
  "float",
  "for",
  "if",
  "implements",
  "import",
  "instanceof",
  "int",
  "interface",
  "long",
  "native",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "static",
  "strictfp",
  "super",
  "switch",
  "synchronized",
  "this",
  "throw",
  "throws",
  "transient",
  "true",
  "try",
  "void",
  "volatile",
  "while"
]);

export function javaLineSpans(line: string): LineTextSpan[] {
  return javaLineResult(line, { inBlockComment: false }).spans;
}

export function javaLineResult(line: string, state: SlashBlockState): SlashBlockResult {
  return slashBlockLineResult(line, state, { keywords: JAVA_KEYWORDS, functionPattern: "call" });
}

