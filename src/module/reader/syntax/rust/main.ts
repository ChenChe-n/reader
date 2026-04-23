import type { LineTextSpan } from "../../../../types";
import { slashBlockLineResult, type SlashBlockResult, type SlashBlockState } from "../utils/slashBlock";
import type { CodeStringMatch, CodeStringRule } from "../utils/stateMachine";

const RUST_KEYWORDS = new Set([
  "as",
  "async",
  "await",
  "break",
  "const",
  "continue",
  "crate",
  "dyn",
  "else",
  "enum",
  "extern",
  "false",
  "fn",
  "for",
  "if",
  "impl",
  "in",
  "let",
  "loop",
  "match",
  "mod",
  "move",
  "mut",
  "pub",
  "ref",
  "return",
  "self",
  "Self",
  "static",
  "struct",
  "super",
  "trait",
  "true",
  "type",
  "unsafe",
  "use",
  "where",
  "while"
]);

const RUST_STRINGS: readonly CodeStringRule[] = [
  { start: '"', end: '"', escape: "\\", multiline: true },
  { start: "'", end: "'", escape: "\\" }
];

/**
 * 解析 Rust 单行语法高亮片段。
 *
 * @param line 当前行文本。
 * @returns 当前行高亮片段。
 */
export function rustLineSpans(line: string): LineTextSpan[] {
  return rustLineResult(line, { inBlockComment: false }).spans;
}

/**
 * 解析 Rust 单行语法高亮片段和跨行状态。
 *
 * @param line 当前行文本。
 * @param state 上一行遗留的扫描状态。
 * @returns 当前行高亮片段和下一行扫描状态。
 */
export function rustLineResult(line: string, state: SlashBlockState): SlashBlockResult {
  return slashBlockLineResult(line, state, { keywords: RUST_KEYWORDS, strings: RUST_STRINGS, stringMatchers: [rustRawStringMatcher] });
}

/**
 * 匹配 Rust 原始字符串，支持 r"..."、r#"..."# 和 br#"..."#。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @returns 命中的字符串配置；没有命中则返回 null。
 */
function rustRawStringMatcher(line: string, index: number): CodeStringMatch | null {
  if (!isRustRawPrefixStart(line, index)) return null;
  const match = /^(?:b)?r(#{0,255})"/.exec(line.slice(index));
  if (!match) return null;
  return { startLength: match[0].length, end: `"${match[1]}`, escape: null, multiline: true };
}

/**
 * 判断当前位置是否可以开始 Rust 原始字符串前缀。
 *
 * @param line 当前行文本。
 * @param index 当前扫描位置。
 * @returns 可以作为原始字符串前缀起点时返回 true。
 */
function isRustRawPrefixStart(line: string, index: number): boolean {
  const previous = line[index - 1] ?? "";
  return !/[A-Za-z0-9_]/.test(previous);
}
