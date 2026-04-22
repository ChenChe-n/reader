import type { PreviewState } from "../../types";
import type { LineMode } from "./workerLineStyles";
import { blobLooksBinary, readTextWithEncoding } from "./workerEncoding";
import { lineTextPreview } from "./workerLineDocument";
import { markdownPreview } from "./workerMarkdown";

interface WorkerRequest {
  file: File;
  mode:
    | "markdown"
    | "text"
    | "json"
    | "html"
    | "html-code"
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
}

interface WorkerResult {
  preview: PreviewState;
  currentText: string;
  meta?: string;
  encoding?: string;
  readMs: number;
  processMs: number;
}

self.onmessage = event => {
  try {
    const request = event.data as WorkerRequest;
    const value = buildPreview(request.file, request.mode);
    self.postMessage({ ok: true, value });
  } catch (error) {
    self.postMessage({ ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};

/**
 * 构建文本类预览结果。
 * @param file 待读取文件。
 * @param mode 预览模式。
 * @returns Worker 预览结果。
 */
function buildPreview(file: File, mode: WorkerRequest["mode"]): WorkerResult {
  const readStart = performance.now();
  if (mode === "fallback" && blobLooksBinary(file.slice(0, 4096))) {
    return {
      preview: { kind: "empty", title: "无法预览此文件", message: `${file.name} · ${file.size} bytes` },
      currentText: "",
      readMs: performance.now() - readStart,
      processMs: 0
    };
  }
  const decoded = readTextWithEncoding(file);
  const readMs = performance.now() - readStart;
  const processStart = performance.now();
  const result = previewForMode(decoded.text, mode);
  return {
    ...result,
    encoding: decoded.encoding,
    readMs,
    processMs: performance.now() - processStart
  };
}

/**
 * 按模式生成预览内容。
 * @param text 文本内容。
 * @param mode 预览模式。
 * @returns 预览和当前文本。
 */
function previewForMode(text: string, mode: WorkerRequest["mode"]): Pick<WorkerResult, "preview" | "currentText" | "meta"> {
  if (mode === "markdown") return { preview: markdownPreview(text), currentText: text, meta: "Markdown 解析预览" };
  if (mode === "html") return { preview: { kind: "html", html: text }, currentText: text, meta: lineTextMeta(mode) };
  if (mode === "html-code") return { preview: lineTextPreview(text, "html"), currentText: text, meta: lineTextMeta(mode) };
  if (mode === "json") {
    const formattedText = formatJsonText(text);
    return { preview: lineTextPreview(formattedText, mode), currentText: formattedText, meta: lineTextMeta(mode) };
  }
  return { preview: lineTextPreview(text, mode as LineMode), currentText: text, meta: lineTextMeta(mode) };
}

/**
 * 生成行文本模式元信息。
 * @param mode 预览模式。
 * @returns 元信息文本。
 */
function lineTextMeta(mode: WorkerRequest["mode"]): string {
  const labels: Record<string, string> = {
    markdown: "Markdown 行文本",
    json: "JSON 行文本",
    html: "HTML 网页预览",
    "html-code": "HTML 代码预览",
    vue: "Vue 行文本",
    css: "CSS 行文本",
    typescript: "TypeScript 行文本",
    javascript: "JavaScript 行文本",
    python: "Python 行文本",
    c: "C 行文本",
    cpp: "C++ 行文本",
    rust: "Rust 行文本",
    java: "Java 行文本",
    shell: "Shell 行文本",
    text: "文本行",
    fallback: "文本行"
  };
  return labels[mode] || "文本行";
}

/**
 * 尝试将 JSON 文本标准化为 2 空格缩进。
 * @param text 原始文本。
 * @returns 格式化后的文本，解析失败时返回原文。
 */
function formatJsonText(text: string): string {
  try {
    return `${JSON.stringify(JSON.parse(text), null, 4)}\n`;
  } catch {
    return text;
  }
}
