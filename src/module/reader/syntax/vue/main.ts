import type { LineTextSpan } from "../../../../types";
import { markupLineResult, type MarkupLineResult, type MarkupState } from "../utils/markup";

export function vueLineSpans(line: string): LineTextSpan[] {
  return vueLineResult(line, { inComment: false }).spans;
}

export function vueLineResult(line: string, state: MarkupState): MarkupLineResult {
  return markupLineResult(line, state);
}

