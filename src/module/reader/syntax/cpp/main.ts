import type { LineTextSpan } from "../../../../types";
import { CPP_KEYWORDS } from "../utils/cCppKeywords";
import { slashBlockLineResult, type SlashBlockResult, type SlashBlockState } from "../utils/slashBlock";

export function cppLineSpans(line: string): LineTextSpan[] {
  return cppLineResult(line, { inBlockComment: false }).spans;
}

export function cppLineResult(line: string, state: SlashBlockState): SlashBlockResult {
  return slashBlockLineResult(line, state, { keywords: CPP_KEYWORDS });
}
