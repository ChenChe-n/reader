import type { LineTextSpan } from "../../../../types";
import { C_KEYWORDS } from "../utils/cCppKeywords";
import { slashBlockLineResult, type SlashBlockResult, type SlashBlockState } from "../utils/slashBlock";

export function cLineSpans(line: string): LineTextSpan[] {
  return cLineResult(line, { inBlockComment: false }).spans;
}

export function cLineResult(line: string, state: SlashBlockState): SlashBlockResult {
  return slashBlockLineResult(line, state, { keywords: C_KEYWORDS, functionPattern: "declaration" });
}
