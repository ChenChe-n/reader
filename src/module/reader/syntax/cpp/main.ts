import type { LineTextSpan } from "../../../../types";
import { slashBlockLineResult, type SlashBlockResult, type SlashBlockState } from "../utils/slashBlock";

const CPP_KEYWORDS = new Set([
  "alignas",
  "auto",
  "bool",
  "break",
  "case",
  "catch",
  "char",
  "class",
  "concept",
  "const",
  "constexpr",
  "continue",
  "decltype",
  "default",
  "delete",
  "do",
  "double",
  "else",
  "enum",
  "explicit",
  "export",
  "extern",
  "false",
  "float",
  "for",
  "friend",
  "if",
  "inline",
  "int",
  "long",
  "namespace",
  "new",
  "noexcept",
  "nullptr",
  "operator",
  "private",
  "protected",
  "public",
  "return",
  "short",
  "signed",
  "sizeof",
  "static",
  "struct",
  "switch",
  "template",
  "this",
  "throw",
  "true",
  "try",
  "typename",
  "union",
  "unsigned",
  "using",
  "virtual",
  "void",
  "volatile",
  "while"
]);

export function cppLineSpans(line: string): LineTextSpan[] {
  return cppLineResult(line, { inBlockComment: false }).spans;
}

export function cppLineResult(line: string, state: SlashBlockState): SlashBlockResult {
  return slashBlockLineResult(line, state, { keywords: CPP_KEYWORDS, functionPattern: "call" });
}

