import type { LineTextSpan } from "../../types";
import { cLineResult, cLineSpans } from "./syntax/c/main";
import { cppLineResult, cppLineSpans } from "./syntax/cpp/main";
import { cssLineResult, cssLineSpans } from "./syntax/css/main";
import { htmlLineResult, htmlLineSpans } from "./syntax/html/main";
import { javaLineResult, javaLineSpans } from "./syntax/java/main";
import { javascriptLineResult, javascriptLineSpans } from "./syntax/javascript/main";
import { jsonLineSpans } from "./syntax/json/main";
import { pythonLineResult, pythonLineSpans, type HashLineState } from "./syntax/python/main";
import { rustLineResult, rustLineSpans } from "./syntax/rust/main";
import { shellLineSpans } from "./syntax/shell/main";
import { typescriptLineResult, typescriptLineSpans, type ScriptSyntaxState } from "./syntax/typescript/main";
import { vueLineResult, vueLineSpans } from "./syntax/vue/main";
import type { MarkupState } from "./syntax/utils/markup";
import type { SlashBlockState } from "./syntax/utils/slashBlock";
import { syncCodeSyntaxState } from "./syntax/utils/stateMachine";

export type LineMode =
  | "markdown"
  | "text"
  | "json"
  | "html"
  | "vue"
  | "css"
  | "typescript"
  | "javascript"
  | "python"
  | "c"
  | "cpp"
  | "rust"
  | "java"
  | "shell"
  | "fallback";

type LineSyntaxState = ScriptSyntaxState | HashLineState | SlashBlockState | MarkupState;

/**
 * 根据文本类型解析行样式。
 * @param line 原始行文本。
 * @param mode 文本模式。
 * @returns 行显示样式。
 */
export function styleForLine(line: string, mode: LineMode): Record<string, string> {
  if (mode === "markdown") return markdownLineStyle(line);
  return {};
}

/**
 * 根据文本类型解析无跨行状态的行内高亮片段。
 * @param line 原始行文本。
 * @param mode 文本模式。
 * @returns 行内高亮片段。
 */
export function spansForLine(line: string, mode: LineMode): LineTextSpan[] {
  if (mode === "json") return jsonLineSpans(line);
  if (mode === "html") return htmlLineSpans(line);
  if (mode === "vue") return vueLineSpans(line);
  if (mode === "css") return cssLineSpans(line);
  if (mode === "typescript") return typescriptLineSpans(line);
  if (mode === "javascript") return javascriptLineSpans(line);
  if (mode === "python") return pythonLineSpans(line);
  if (mode === "c") return cLineSpans(line);
  if (mode === "cpp") return cppLineSpans(line);
  if (mode === "rust") return rustLineSpans(line);
  if (mode === "java") return javaLineSpans(line);
  if (mode === "shell") return shellLineSpans(line);
  return [];
}

/**
 * 创建指定文本类型的跨行语法状态。
 * @param mode 文本模式。
 * @returns 跨行语法状态；无需状态的模式返回 null。
 */
export function createLineSyntaxState(mode: LineMode): LineSyntaxState | null {
  if (mode === "typescript" || mode === "javascript" || mode === "python") return { inBlockComment: false };
  if (mode === "c" || mode === "cpp" || mode === "rust" || mode === "java" || mode === "css") return { inBlockComment: false };
  if (mode === "html" || mode === "vue") {
    return { inComment: false, inScript: false, inStyle: false, inScriptBlockComment: false, inStyleBlockComment: false };
  }
  return null;
}

/**
 * 根据文本类型和上一行状态解析行内高亮片段。
 * @param line 原始行文本。
 * @param mode 文本模式。
 * @param state 上一行遗留的语法状态。
 * @returns 行内高亮片段。
 */
export function spansForLineWithState(line: string, mode: LineMode, state: LineSyntaxState | null): LineTextSpan[] {
  if (!state) return spansForLine(line, mode);
  if (mode === "typescript") {
    const scriptState = state as ScriptSyntaxState;
    const result = typescriptLineResult(line, scriptState);
    syncCodeSyntaxState(scriptState, result.state);
    return result.spans;
  }
  if (mode === "javascript") {
    const scriptState = state as ScriptSyntaxState;
    const result = javascriptLineResult(line, scriptState);
    syncCodeSyntaxState(scriptState, result.state);
    return result.spans;
  }
  if (mode === "python") {
    const hashState = state as HashLineState;
    const result = pythonLineResult(line, hashState);
    syncCodeSyntaxState(hashState, result.state);
    return result.spans;
  }
  if (mode === "c") {
    const blockState = state as SlashBlockState;
    const result = cLineResult(line, blockState);
    syncCodeSyntaxState(blockState, result.state);
    return result.spans;
  }
  if (mode === "cpp") {
    const blockState = state as SlashBlockState;
    const result = cppLineResult(line, blockState);
    syncCodeSyntaxState(blockState, result.state);
    return result.spans;
  }
  if (mode === "rust") {
    const blockState = state as SlashBlockState;
    const result = rustLineResult(line, blockState);
    syncCodeSyntaxState(blockState, result.state);
    return result.spans;
  }
  if (mode === "java") {
    const blockState = state as SlashBlockState;
    const result = javaLineResult(line, blockState);
    syncCodeSyntaxState(blockState, result.state);
    return result.spans;
  }
  if (mode === "css") {
    const blockState = state as SlashBlockState;
    const result = cssLineResult(line, blockState);
    syncCodeSyntaxState(blockState, result.state);
    return result.spans;
  }
  if (mode === "html") {
    const markupState = state as MarkupState;
    const result = htmlLineResult(line, markupState);
    markupState.inComment = result.state.inComment;
    markupState.inScript = result.state.inScript;
    markupState.inStyle = result.state.inStyle;
    markupState.inScriptBlockComment = result.state.inScriptBlockComment;
    markupState.inStyleBlockComment = result.state.inStyleBlockComment;
    return result.spans;
  }
  if (mode === "vue") {
    const markupState = state as MarkupState;
    const result = vueLineResult(line, markupState);
    markupState.inComment = result.state.inComment;
    markupState.inScript = result.state.inScript;
    markupState.inStyle = result.state.inStyle;
    markupState.inScriptBlockComment = result.state.inScriptBlockComment;
    markupState.inStyleBlockComment = result.state.inStyleBlockComment;
    return result.spans;
  }
  return spansForLine(line, mode);
}

/**
 * 解析 Markdown 行样式。
 * @param line 原始行文本。
 * @returns 行样式。
 */
function markdownLineStyle(line: string): Record<string, string> {
  if (/^#{1,6}\s+/.test(line)) return { color: "var(--text)", fontWeight: "700" };
  if (/^\s*>/.test(line)) return { color: "var(--muted)", borderLeft: "3px solid var(--line-strong)", paddingLeft: "10px" };
  if (/^\s*[-*+]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) return { color: "var(--text)" };
  if (/^\s*```/.test(line)) return { color: "var(--accent)", fontWeight: "600" };
  return {};
}
