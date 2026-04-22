import type { LineTextSpan } from "../../../../types";
import { markupLineResult, type MarkupLineResult, type MarkupState } from "../utils/markup";

export function htmlLineSpans(line: string): LineTextSpan[] {
  return htmlLineResult(line, { inComment: false }).spans;
}

export function htmlLineResult(line: string, state: MarkupState): MarkupLineResult {
  return markupLineResult(line, state);
}

