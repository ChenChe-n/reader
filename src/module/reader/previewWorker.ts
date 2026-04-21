import type { PreviewState } from "../../types";

declare const FileReaderSync: {
  new (): {
    readAsArrayBuffer(blob: Blob): ArrayBuffer;
  };
};

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

interface DecodeResult {
  text: string;
  encoding: string;
}

const MAX_LINE_LENGTH = 4096;

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
  if (mode === "fallback" && looksBinary(new Uint8Array(readBuffer(file.slice(0, 4096))))) {
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
  if (mode === "html") return { preview: { kind: "html", html: text }, currentText: text };
  return { preview: lineTextPreview(text), currentText: "", meta: lineTextMeta(mode) };
}

/**
 * 创建行文本预览。
 * @param text 文本内容。
 * @returns 行文本预览。
 */
function lineTextPreview(text: string): PreviewState {
  const lines: Record<string, { data: string; style: Record<string, string> }> = {};
  let index = 0;
  text.split(/\r\n|\n|\r/).forEach((line, sourceLine) => {
    if (!line) {
      lines[String(index)] = { data: "", style: { "--source-line": String(sourceLine), "--chunk": "0" } };
      index += 1;
      return;
    }
    for (let offset = 0; offset < line.length; offset += MAX_LINE_LENGTH) {
      lines[String(index)] = {
        data: line.slice(offset, offset + MAX_LINE_LENGTH),
        style: { "--source-line": String(sourceLine), "--chunk": String(offset / MAX_LINE_LENGTH) }
      };
      index += 1;
    }
  });
  return { kind: "lineText", lineText: { lines, lineCount: index } };
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

/**
 * 读取并识别文本编码。
 * @param file 待读取文件。
 * @returns 文本和编码。
 */
function readTextWithEncoding(file: File): DecodeResult {
  const buffer = readBuffer(file);
  const bytes = new Uint8Array(buffer);
  const bom = detectBom(bytes);
  if (bom) return { text: new TextDecoder(bom.decoder).decode(bytes.slice(bom.length)), encoding: bom.label };
  return pickBestEncoding(buffer);
}

/**
 * 同步读取 Blob 内容。
 * @param blob 待读取内容。
 * @returns ArrayBuffer。
 */
function readBuffer(blob: Blob): ArrayBuffer {
  return new FileReaderSync().readAsArrayBuffer(blob);
}

/**
 * 从候选编码中选择最像文本的结果。
 * @param buffer 文件内容。
 * @returns 解码结果。
 */
function pickBestEncoding(buffer: ArrayBuffer): DecodeResult {
  const candidates: Array<[string, string]> = [
    ["utf-8", "UTF-8"],
    ["gb18030", "GB18030/GBK"],
    ["big5", "Big5"],
    ["shift_jis", "Shift_JIS"],
    ["windows-1252", "Windows-1252"]
  ];
  let best: (DecodeResult & { score: number }) | null = null;
  for (const [decoderName, label] of candidates) {
    try {
      const text = new TextDecoder(decoderName, { fatal: false }).decode(buffer);
      const score = scoreDecodedText(text);
      if (!best || score < best.score) best = { text, encoding: label, score };
    } catch {
      continue;
    }
  }
  return best ?? { text: new TextDecoder("utf-8", { fatal: false }).decode(buffer), encoding: "UTF-8 fallback" };
}

/**
 * 为解码结果打分。
 * @param text 解码后的文本。
 * @returns 错误倾向评分。
 */
function scoreDecodedText(text: string): number {
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  let controlCount = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 32 && ![9, 10, 13].includes(code)) controlCount += 1;
  }
  return replacementCount * 20 + controlCount;
}

/**
 * 检测文本 BOM。
 * @param bytes 文件字节。
 * @returns BOM 信息或 null。
 */
function detectBom(bytes: Uint8Array): { decoder: string; label: string; length: number } | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { decoder: "utf-8", label: "UTF-8 BOM", length: 3 };
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return { decoder: "utf-16le", label: "UTF-16 LE", length: 2 };
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return { decoder: "utf-16be", label: "UTF-16 BE", length: 2 };
  return null;
}

/**
 * 判断样本是否像二进制。
 * @param bytes 样本字节。
 * @returns 是否倾向二进制。
 */
function looksBinary(bytes: Uint8Array): boolean {
  const sampleLength = Math.min(bytes.length, 4096);
  if (sampleLength === 0) return false;
  let suspicious = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    const value = bytes[index];
    if (value === 0) return true;
    if (value < 32 && ![7, 8, 9, 10, 12, 13, 27].includes(value)) suspicious += 1;
  }
  return suspicious / sampleLength > 0.02;
}
