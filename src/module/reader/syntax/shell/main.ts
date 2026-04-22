import type { LineTextSpan } from "../../../../types";
import { hashLineSpans } from "../utils/hashLine";

const SHELL_KEYWORDS = new Set([
  "case",
  "do",
  "done",
  "elif",
  "else",
  "esac",
  "fi",
  "for",
  "function",
  "if",
  "in",
  "select",
  "then",
  "time",
  "until",
  "while"
]);

export function shellLineSpans(line: string): LineTextSpan[] {
  return hashLineSpans(line, SHELL_KEYWORDS);
}

