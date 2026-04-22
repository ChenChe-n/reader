import * as XLSX from "xlsx";
import type { SpreadsheetDocument, SpreadsheetMerge, SpreadsheetSheet } from "../../types";
import { decodeTextBuffer } from "../../utils/encoding";

/**
 * 从 Excel 或 CSV 文件内容创建表格预览文档。
 * @param buffer 文件内容。
 * @param ext 文件后缀。
 * @returns 表格文档。
 */
export function parseSpreadsheet(buffer: ArrayBuffer, ext: string): SpreadsheetDocument {
  const workbook = ext === "csv" ? readCsvWorkbook(buffer) : XLSX.read(buffer, { type: "array", cellDates: true });
  return { sheets: workbook.SheetNames.map(name => parseSheet(name, workbook.Sheets[name])) };
}

/**
 * 生成表格元信息。
 * @param document 表格文档。
 * @param label 文件类型标签。
 * @returns 元信息文本。
 */
export function spreadsheetMeta(document: SpreadsheetDocument, label: string): string {
  const cells = document.sheets.reduce((sum, sheet) => sum + sheet.rowCount * sheet.colCount, 0);
  return `${label} 预览 · ${document.sheets.length} 个工作表 · ${cells.toLocaleString()} 个单元格范围`;
}

/**
 * 读取 CSV 为 SheetJS 工作簿。
 * @param buffer 文件内容。
 * @returns 工作簿。
 */
function readCsvWorkbook(buffer: ArrayBuffer): XLSX.WorkBook {
  const text = decodeTextBuffer(buffer).text;
  return XLSX.read(text, { type: "string", raw: false });
}

/**
 * 转换单个工作表为轻量数据模型。
 * @param name 工作表名称。
 * @param sheet SheetJS 工作表。
 * @returns 表格工作表。
 */
function parseSheet(name: string, sheet: XLSX.WorkSheet): SpreadsheetSheet {
  const range = XLSX.utils.decode_range(sheet["!ref"] || "A1");
  const cells: SpreadsheetSheet["cells"] = {};
  for (let row = range.s.r; row <= range.e.r; row += 1) {
    for (let col = range.s.c; col <= range.e.c; col += 1) {
      const cell = sheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (cell?.w !== undefined || cell?.v !== undefined) cells[cellKey(row, col)] = { row, col, value: String(cell.w ?? cell.v ?? "") };
    }
  }
  return {
    name,
    rowCount: Math.max(1, range.e.r + 1),
    colCount: Math.max(1, range.e.c + 1),
    cells,
    merges: parseMerges(sheet["!merges"] || [])
  };
}

/**
 * 转换单元格合并范围。
 * @param merges SheetJS 合并范围。
 * @returns 内部合并范围。
 */
function parseMerges(merges: XLSX.Range[]): SpreadsheetMerge[] {
  return merges.map(merge => ({
    startRow: merge.s.r,
    startCol: merge.s.c,
    endRow: merge.e.r,
    endCol: merge.e.c
  }));
}

/**
 * 获取单元格键。
 * @param row 行号。
 * @param col 列号。
 * @returns 单元格键。
 */
function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}
