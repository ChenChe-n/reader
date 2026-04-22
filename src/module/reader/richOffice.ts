import * as XLSX from "xlsx";

const SHEET_LIMIT = 8;
const ROW_LIMIT = 220;
const COL_LIMIT = 60;

/**
 * 创建 Excel 表格预览 HTML。
 * @param buffer 文件内容。
 * @returns HTML 和工作表数量。
 */
export function renderWorkbookHtml(buffer: ArrayBuffer): { html: string; sheetCount: number } {
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets = workbook.SheetNames.slice(0, SHEET_LIMIT).map(name => renderSheet(name, workbook.Sheets[name]));
  const suffix = workbook.SheetNames.length > SHEET_LIMIT ? `<p>仅显示前 ${SHEET_LIMIT} 个工作表。</p>` : "";
  return { html: wrapOfficeHtml(`${sheets.join("")}${suffix}`), sheetCount: workbook.SheetNames.length };
}

/**
 * 从旧版 Word 二进制中抽取可读字符串。
 * @param bytes 文件字节。
 * @returns 文本文档。
 */
export function extractLegacyDocText(bytes: Uint8Array): string {
  const latin = Array.from(new TextDecoder("windows-1252").decode(bytes).matchAll(/[^\x00-\x08\x0e-\x1f]{4,}/g), item => item[0]);
  const utf16 = Array.from(new TextDecoder("utf-16le").decode(bytes).matchAll(/[^\u0000-\u0008\u000e-\u001f]{4,}/g), item => item[0]);
  return [...latin, ...utf16].map(cleanExtractedText).filter(Boolean).slice(0, 1200).join("\n");
}

/**
 * 包装 Office HTML。
 * @param body 主体 HTML。
 * @returns 完整 HTML。
 */
export function wrapOfficeHtml(body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${OFFICE_CSS}</style></head><body><main class="office-preview">${body}</main></body></html>`;
}

/**
 * 转义 HTML 文本。
 * @param value 待转义内容。
 * @returns 安全文本。
 */
export function escapeHtml(value: unknown): string {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] || char);
}

/**
 * 渲染单个工作表的表格。
 * @param name 工作表名称。
 * @param sheet 工作表对象。
 * @returns HTML 字符串。
 */
function renderSheet(name: string, sheet: XLSX.WorkSheet): string {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const maxRow = Math.min(range.e.r, range.s.r + ROW_LIMIT - 1);
  const maxCol = Math.min(range.e.c, range.s.c + COL_LIMIT - 1);
  const rows = Array.from({ length: maxRow - range.s.r + 1 }, (_, rowIndex) => renderSheetRow(sheet, range.s.r + rowIndex, range.s.c, maxCol));
  return `<section class="office-sheet"><h2 class="office-title">${escapeHtml(name)}</h2><div class="office-scroll"><table class="office-table"><tbody>${rows.join("")}</tbody></table></div></section>`;
}

/**
 * 渲染工作表中的一行。
 * @param sheet 工作表对象。
 * @param row 行号。
 * @param startCol 起始列。
 * @param endCol 结束列。
 * @returns HTML 字符串。
 */
function renderSheetRow(sheet: XLSX.WorkSheet, row: number, startCol: number, endCol: number): string {
  const cells = Array.from({ length: endCol - startCol + 1 }, (_, index) => {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: startCol + index })];
    return `<td>${escapeHtml(cell?.w ?? cell?.v ?? "")}</td>`;
  });
  return `<tr>${cells.join("")}</tr>`;
}

/**
 * 清理抽取出的二进制文本片段。
 * @param value 原始片段。
 * @returns 清理后的文本。
 */
function cleanExtractedText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const OFFICE_CSS = `
:root{--panel:#fff;--panel-2:#f7f9fc;--text:#172033;--line:#dbe3ef;--table-head:#eef4fb;--shadow:0 14px 38px rgba(29,41,57,.08)}
body{margin:0;background:var(--panel-2);color:var(--text);font:14px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.office-preview{max-width:1180px;margin:0 auto;padding:24px}
.office-sheet,.office-page{margin:0 0 18px;border:1px solid var(--line);border-radius:8px;background:var(--panel);box-shadow:var(--shadow);overflow:hidden}
.office-title{margin:0;padding:12px 16px;border-bottom:1px solid var(--line);background:var(--panel-2);font-size:14px;font-weight:700}
.office-scroll{overflow:auto}
.office-table{width:100%;border-collapse:collapse;font-size:13px}
.office-table td{min-width:96px;max-width:420px;padding:7px 10px;border:1px solid var(--line);vertical-align:top;overflow-wrap:anywhere}
.office-doc{padding:22px 28px}
.office-doc img{max-width:100%;height:auto}
.office-doc pre{white-space:pre-wrap;overflow-wrap:anywhere}
`;
