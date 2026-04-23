import type { LineTextSpan } from "../../../../types";
import { slashBlockLineResult, type SlashBlockResult, type SlashBlockState } from "../utils/slashBlock";

const CSS_KEYWORDS = new Set([
  "important",
  "inherit",
  "initial",
  "none",
  "revert",
  "unset",
  "var"
]);

export function cssLineSpans(line: string): LineTextSpan[] {
  return cssLineResult(line, { inBlockComment: false }).spans;
}

export function cssLineResult(line: string, state: SlashBlockState): SlashBlockResult {
  return slashBlockLineResult(line, state, { keywords: CSS_KEYWORDS, lineComment: "\u0000" });
}
