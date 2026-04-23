import type { LineTextSpan } from "../../../../types";
import { readKeywordTokenEnd, readProgramTokenEnd, readQuotedString } from "../utils/scan";
import { tokensToSpans, type SyntaxToken } from "../utils/tokens";

const JSON_KEYWORDS = new Set(["true", "false", "null"]);

type TokenScanState = "normal" | "string";

export function jsonLineSpans(line: string): LineTextSpan[] {
  const tokens: SyntaxToken[] = [];
  let index = 0;
  while (index < line.length) {
    const scanState = jsonTokenState(line, index);

    if (scanState === "string") {
      const end = readQuotedString(line, index);
      tokens.push({ start: index, end, kind: "string" });
      index = end;
      continue;
    }

    const keywordEnd = readKeywordTokenEnd(line, index, JSON_KEYWORDS);
    if (keywordEnd !== null) {
      tokens.push({ start: index, end: keywordEnd, kind: "keyword" });
      index = keywordEnd;
      continue;
    }

    const tokenEnd = readProgramTokenEnd(line, index);
    if (tokenEnd !== null) {
      index = tokenEnd;
      continue;
    }

    index += 1;
  }
  return tokensToSpans(tokens, line.length);
}

/**
 * 根据当前位置内容判断 JSON 扫描器的 token 状态。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @returns 当前位置对应的 token 状态。
 */
function jsonTokenState(line: string, index: number): TokenScanState {
  return line[index] === '"' ? "string" : "normal";
}
