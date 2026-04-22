import { layout, prepare, type PrepareOptions } from "@chenglou/pretext";
import { fontForLineStyle } from "./pretextLineWidth";

const PRE_WRAP: PrepareOptions = { whiteSpace: "pre-wrap" };

/**
 * 使用 Pretext 在给定列宽下计算「自动换行」后的块高度（与 layout 一致）。
 * @param text 单行逻辑文本。
 * @param style 行内联样式（决定字重/字体串）。
 * @param textColumnWidthPx 文本区可用宽度（像素）。
 * @param lineHeightPx 行高（像素）。
 * @returns 块总高度（像素），至少为 lineHeightPx。
 */
export function wrappedBlockHeightPx(
  text: string,
  style: Record<string, string>,
  textColumnWidthPx: number,
  lineHeightPx: number
): number {
  const w = Math.max(1, textColumnWidthPx);
  const font = fontForLineStyle(style);
  const prepared = prepare(text, font, PRE_WRAP);
  const { height } = layout(prepared, w, lineHeightPx);
  return Math.max(lineHeightPx, height);
}

/**
 * 在精确计算前用于占位，避免滚动条跳动过大。
 */
export function heuristicWrappedHeightPx(textLength: number, textColumnWidthPx: number, lineHeightPx: number): number {
  const w = Math.max(1, textColumnWidthPx);
  const estChars = Math.max(8, Math.floor(w / 7));
  const lines = Math.max(1, Math.ceil(textLength / estChars));
  return lines * lineHeightPx;
}
