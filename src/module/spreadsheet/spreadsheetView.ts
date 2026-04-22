import type { SpreadsheetMerge, SpreadsheetSheet } from "../../types";

export const ROW_HEIGHT = 30;
export const COL_WIDTH = 128;
export const ROW_HEAD_WIDTH = 56;
export const COL_HEAD_HEIGHT = 32;
export const BUFFER_ROWS = 8;
export const BUFFER_COLS = 4;

export interface VisibleCell {
  key: string;
  row: number;
  col: number;
  rowSpan: number;
  colSpan: number;
  value: string;
}

export interface VisibleRange {
  startRow: number;
  endRow: number;
  startCol: number;
  endCol: number;
}

/**
 * 构建可视单元格列表。
 * @param sheet 当前工作表。
 * @param visible 当前可视范围。
 * @returns 可渲染单元格。
 */
export function buildVisibleCells(sheet: SpreadsheetSheet, visible: VisibleRange): VisibleCell[] {
  const cells: VisibleCell[] = [];
  const covered = new Set<string>();
  for (const merge of visibleMerges(sheet.merges, visible)) markCoveredCells(covered, merge);
  for (const merge of visibleMerges(sheet.merges, visible)) addMergedCell(cells, sheet, merge);
  for (const row of range(visible.startRow, visible.endRow)) {
    for (const col of range(visible.startCol, visible.endCol)) addNormalCell(cells, sheet, covered, row, col);
  }
  return cells;
}

/**
 * 获取单元格样式。
 * @param cell 可视单元格。
 * @returns CSS 样式。
 */
export function cellStyle(cell: VisibleCell): Record<string, string> {
  return {
    left: `${ROW_HEAD_WIDTH + cell.col * COL_WIDTH}px`,
    top: `${COL_HEAD_HEIGHT + cell.row * ROW_HEIGHT}px`,
    width: `${cell.colSpan * COL_WIDTH}px`,
    height: `${cell.rowSpan * ROW_HEIGHT}px`
  };
}

/**
 * 生成连续数字范围。
 * @param start 起始值。
 * @param end 结束值。
 * @returns 数字列表。
 */
export function range(start: number, end: number): number[] {
  if (end < start) return [];
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

/**
 * 生成 Excel 风格列名。
 * @param index 零基列号。
 * @returns 列名。
 */
export function columnName(index: number): string {
  let name = "";
  let value = index + 1;
  while (value > 0) {
    const mod = (value - 1) % 26;
    name = String.fromCharCode(65 + mod) + name;
    value = Math.floor((value - mod) / 26);
  }
  return name;
}

/**
 * 添加普通单元格。
 * @param cells 单元格列表。
 * @param sheet 当前工作表。
 * @param covered 被合并覆盖的键集合。
 * @param row 行号。
 * @param col 列号。
 * @returns 无返回值。
 */
function addNormalCell(cells: VisibleCell[], sheet: SpreadsheetSheet, covered: Set<string>, row: number, col: number): void {
  if (covered.has(cellKey(row, col)) || sheet.merges.some(merge => merge.startRow === row && merge.startCol === col)) return;
  const value = sheet.cells[cellKey(row, col)]?.value || "";
  cells.push({ key: cellKey(row, col), row, col, value, rowSpan: 1, colSpan: 1 });
}

/**
 * 添加合并单元格。
 * @param cells 单元格列表。
 * @param sheet 当前工作表。
 * @param merge 合并范围。
 * @returns 无返回值。
 */
function addMergedCell(cells: VisibleCell[], sheet: SpreadsheetSheet, merge: SpreadsheetMerge): void {
  cells.push({
    key: cellKey(merge.startRow, merge.startCol),
    row: merge.startRow,
    col: merge.startCol,
    value: sheet.cells[cellKey(merge.startRow, merge.startCol)]?.value || "",
    rowSpan: merge.endRow - merge.startRow + 1,
    colSpan: merge.endCol - merge.startCol + 1
  });
}

/**
 * 筛选与可视区域相交的合并范围。
 * @param merges 合并范围列表。
 * @param visible 可视范围。
 * @returns 相交合并范围。
 */
function visibleMerges(merges: SpreadsheetMerge[], visible: VisibleRange): SpreadsheetMerge[] {
  return merges.filter(merge => merge.endRow >= visible.startRow && merge.startRow <= visible.endRow && merge.endCol >= visible.startCol && merge.startCol <= visible.endCol);
}

/**
 * 标记合并范围中非左上角的单元格。
 * @param covered 被覆盖单元格集合。
 * @param merge 合并范围。
 * @returns 无返回值。
 */
function markCoveredCells(covered: Set<string>, merge: SpreadsheetMerge): void {
  for (let row = merge.startRow; row <= merge.endRow; row += 1) {
    for (let col = merge.startCol; col <= merge.endCol; col += 1) {
      if (row !== merge.startRow || col !== merge.startCol) covered.add(cellKey(row, col));
    }
  }
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
