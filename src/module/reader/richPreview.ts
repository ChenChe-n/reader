import DOMPurify from "dompurify";
import { readPsd } from "ag-psd";
import mammoth from "mammoth/mammoth.browser";
import type { PreviewState } from "../../types";
import { escapeHtml, extractLegacyDocText, wrapOfficeHtml } from "./richOffice";
import { parseSpreadsheet, spreadsheetMeta } from "./richSpreadsheet";

export interface RichPreviewResult {
  preview: PreviewState;
  currentText: string;
  meta: string;
  readMs: number;
  processMs: number;
}

/**
 * 判断后缀是否是富文档预览支持的格式。
 * @param ext 文件后缀。
 * @returns 是否支持。
 */
export function isRichPreviewFile(ext: string): boolean {
  return ["pdf", "xlsx", "xls", "csv", "doc", "docx", "psd"].includes(ext);
}

/**
 * 构建富文档只读预览。
 * @param file 当前文件。
 * @param ext 文件后缀。
 * @param createUrl object URL 创建器。
 * @returns 预览结果。
 */
export async function buildRichPreview(file: File, ext: string, createUrl: (file: Blob) => string): Promise<RichPreviewResult> {
  if (ext === "pdf") return buildPdfPreview(file, createUrl);
  const readStart = performance.now();
  const buffer = await file.arrayBuffer();
  const readMs = performance.now() - readStart;
  const processStart = performance.now();
  const result = await buildBufferedPreview(file, ext, buffer, createUrl);
  return { ...result, readMs, processMs: performance.now() - processStart };
}

/**
 * 创建 PDF 原生浏览器预览。
 * @param file PDF 文件。
 * @param createUrl object URL 创建器。
 * @returns 预览结果。
 */
function buildPdfPreview(file: File, createUrl: (file: Blob) => string): RichPreviewResult {
  return {
    preview: { kind: "document", documentKind: "pdf", fileName: file.name, url: createUrl(file) },
    currentText: "",
    meta: "PDF 原生预览",
    readMs: 0,
    processMs: 0
  };
}

/**
 * 按格式处理已读入内存的富文档。
 * @param file 当前文件。
 * @param ext 文件后缀。
 * @param buffer 文件内容。
 * @param createUrl object URL 创建器。
 * @returns 预览结果主体。
 */
async function buildBufferedPreview(
  file: File,
  ext: string,
  buffer: ArrayBuffer,
  createUrl: (file: Blob) => string
): Promise<Omit<RichPreviewResult, "readMs" | "processMs">> {
  if (ext === "xlsx" || ext === "xls" || ext === "csv") return buildSpreadsheetPreview(buffer, ext);
  if (ext === "docx") return buildDocxPreview(buffer);
  if (ext === "doc") return buildLegacyDocPreview(buffer);
  return buildPsdPreview(file, buffer, createUrl);
}

/**
 * 创建表格预览。
 * @param buffer 文件内容。
 * @param ext 文件后缀。
 * @returns 预览结果主体。
 */
function buildSpreadsheetPreview(buffer: ArrayBuffer, ext: string): Omit<RichPreviewResult, "readMs" | "processMs"> {
  const spreadsheet = parseSpreadsheet(buffer, ext);
  const label = ext === "csv" ? "CSV" : "Excel";
  return {
    preview: { kind: "spreadsheet", spreadsheet },
    currentText: "",
    meta: spreadsheetMeta(spreadsheet, label)
  };
}

/**
 * 创建 docx 转 HTML 预览。
 * @param buffer 文件内容。
 * @returns 预览结果主体。
 */
async function buildDocxPreview(buffer: ArrayBuffer): Promise<Omit<RichPreviewResult, "readMs" | "processMs">> {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, { convertImage: mammoth.images.dataUri });
  const body = DOMPurify.sanitize(result.value, { ADD_ATTR: ["style"] });
  const warning = result.messages.length ? `<p>${escapeHtml(result.messages.length)} 条转换提示，部分复杂排版可能被简化。</p>` : "";
  return {
    preview: { kind: "html", html: wrapOfficeHtml(`<article class="office-page office-doc">${body || "<p>文档没有可显示内容。</p>"}</article>${warning}`) },
    currentText: "",
    meta: "DOCX 转换预览"
  };
}

/**
 * 创建旧版 doc 的尽力文本预览。
 * @param buffer 文件内容。
 * @returns 预览结果主体。
 */
function buildLegacyDocPreview(buffer: ArrayBuffer): Omit<RichPreviewResult, "readMs" | "processMs"> {
  const text = extractLegacyDocText(new Uint8Array(buffer));
  const body = text ? `<pre>${escapeHtml(text)}</pre>` : "<p>未能从旧版 Word 二进制中提取到可读文本。</p>";
  return {
    preview: { kind: "html", html: wrapOfficeHtml(`<article class="office-page office-doc">${body}</article>`) },
    currentText: text,
    meta: "DOC 尽力文本预览"
  };
}

/**
 * 创建 PSD 合成图预览。
 * @param file 当前文件。
 * @param buffer 文件内容。
 * @param createUrl object URL 创建器。
 * @returns 预览结果主体。
 */
function buildPsdPreview(file: File, buffer: ArrayBuffer, createUrl: (file: Blob) => string): Omit<RichPreviewResult, "readMs" | "processMs"> {
  const psd = readPsd(buffer, { useImageData: true, skipLayerImageData: true });
  if (!psd.imageData) {
    return { preview: { kind: "empty", title: "无法预览 PSD", message: "文件没有可读取的合成图层。" }, currentText: "", meta: "PSD" };
  }
  const canvas = document.createElement("canvas");
  canvas.width = psd.imageData.width;
  canvas.height = psd.imageData.height;
  const context = canvas.getContext("2d");
  context?.putImageData(new ImageData(new Uint8ClampedArray(psd.imageData.data), psd.imageData.width, psd.imageData.height), 0, 0);
  const url = createUrl(dataUrlToBlob(canvas.toDataURL("image/png")));
  return {
    preview: { kind: "media", mediaKind: "image", fileName: file.name, url },
    currentText: "",
    meta: `PSD 合成图 · ${psd.width}×${psd.height}`
  };
}

/**
 * 将 data URL 转为 Blob。
 * @param dataUrl 图片 data URL。
 * @returns 图片 Blob。
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, data] = dataUrl.split(",");
  const mime = /data:(.*?);/.exec(meta)?.[1] || "image/png";
  const binary = atob(data);
  return new Blob([Uint8Array.from(binary, char => char.charCodeAt(0))], { type: mime });
}
