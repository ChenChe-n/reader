import type { PreviewState } from "../../types";
import type { LineMode } from "./workerLineStyles";
import { blobLooksBinary, readTextWithEncoding } from "./workerEncoding";
import { lineTextPreview } from "./workerLineDocument";
import { markdownPreview } from "./workerMarkdown";

interface WorkerRequest {
  file: File;
  mode: "markdown" | "text" | "json" | "html" | "fallback";
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
  if (mode === "html") return { preview: { kind: "html", html: text }, currentText: text };
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
    text: "文本行",
    fallback: "文本行"
  };
  return labels[mode] || "文本行";
}
