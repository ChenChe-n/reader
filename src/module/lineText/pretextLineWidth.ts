import { prepareWithSegments, measureNaturalWidth, type PrepareOptions } from "@chenglou/pretext";
import type { LineTextDocument, LineTextLine } from "../../types";

/** 与 CSS `white-space: pre` 一致：保留空白；测宽时用极大 maxWidth，故不会软换行。 */
const PREPARE_OPTS: PrepareOptions = { whiteSpace: "pre-wrap" };

/** 与 `.line-text-viewer` / `.line-text-data` 一致的字号与字族。 */
const FONT_FAMILY = `13px Consolas, "Courier New", monospace`;

/**
 * 由行内联样式得到 Pretext / Canvas 的 font 字符串。
 * @param style 行样式。
 * @returns font 值。
 */
export function fontForLineStyle(style: Record<string, string>): string {
  const w = style.fontWeight;
  const weight = w === "700" || w === "bold" ? "700" : w === "600" ? "600" : "400";
  return `${weight} ${FONT_FAMILY}`;
}

/**
 * 单行在「不换行」下的自然宽度（Pretext + 浏览器字形缓存）。
 * @param data 行文本。
 * @param style 行样式。
 * @returns 像素宽度。
 */
export function naturalWidthForLine(data: string, style: Record<string, string>): number {
  const prepared = prepareWithSegments(data, fontForLineStyle(style), PREPARE_OPTS);
  return measureNaturalWidth(prepared);
}

/**
 * 单次扫描文档，得到 UTF-16 长度意义下的最大行长（极轻量，用于安全下限）。
 * @param doc 行文档。
 * @returns 最大 data.length。
 */
export function maxDataLength(doc: LineTextDocument): number {
  let max = 0;
  for (let i = 0; i < doc.lineCount; i += 1) {
    const line = doc.lines[String(i)] as LineTextLine | undefined;
    if (line) max = Math.max(max, line.data.length);
  }
  return max;
}

/**
 * 在 13px 等宽场景下为「全角/CJK/粗体」留足余量的上界系数，避免在 Pretext 分块扫描完成前横向裁切。
 */
const HEURISTIC_PX_PER_CHAR = 14;

export function heuristicMinContentWidthPx(doc: LineTextDocument, gutterPx: number, dataPaddingPx: number): number {
  const maxLen = maxDataLength(doc);
  return gutterPx + dataPaddingPx + maxLen * HEURISTIC_PX_PER_CHAR;
}
