<template>
  <section class="sheet-viewer">
    <div v-if="document.sheets.length > 1" class="sheet-tabs" role="tablist">
      <button
        v-for="(sheet, index) in document.sheets"
        :key="sheet.name"
        class="sheet-tab"
        :class="{ active: index === activeIndex }"
        type="button"
        @click="selectSheet(index)"
      >
        {{ sheet.name }}
      </button>
    </div>
    <div ref="viewportRef" class="sheet-viewport" @scroll="updateViewport">
      <div class="sheet-canvas" :style="canvasStyle">
        <div class="sheet-corner" :style="cornerStyle"></div>
        <div
          v-for="col in visibleCols"
          :key="`h-${col}`"
          class="sheet-col-head"
          :style="colHeadStyle(col)"
        >
          {{ columnName(col) }}
        </div>
        <div
          v-for="row in visibleRows"
          :key="`r-${row}`"
          class="sheet-row-head"
          :style="rowHeadStyle(row)"
        >
          {{ row + 1 }}
        </div>
        <div
          v-for="cell in visibleCells"
          :key="cell.key"
          class="sheet-cell"
          :class="{ merged: cell.rowSpan > 1 || cell.colSpan > 1 }"
          :style="cellStyle(cell)"
          :title="cell.value"
        >
          {{ cell.value }}
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import type { SpreadsheetDocument } from "../types";
import {
  BUFFER_COLS,
  BUFFER_ROWS,
  COL_HEAD_HEIGHT,
  COL_WIDTH,
  ROW_HEAD_WIDTH,
  ROW_HEIGHT,
  buildVisibleCells,
  cellStyle,
  columnName,
  range
} from "./spreadsheet/spreadsheetView";

const props = defineProps<{ document: SpreadsheetDocument }>();
const viewportRef = ref<HTMLElement | null>(null);
const activeIndex = ref(0);
const rawScrollLeft = ref(0);
const rawScrollTop = ref(0);
const scrollLeft = ref(0);
const scrollTop = ref(0);
const viewportWidth = ref(0);
const viewportHeight = ref(0);
const activeSheet = computed(() => props.document.sheets[activeIndex.value] || props.document.sheets[0]);
const visibleRows = computed(() => range(visibleStartRow.value, visibleEndRow.value));
const visibleCols = computed(() => range(visibleStartCol.value, visibleEndCol.value));
const visibleStartRow = computed(() => Math.max(0, Math.floor(scrollTop.value / ROW_HEIGHT) - BUFFER_ROWS));
const visibleStartCol = computed(() => Math.max(0, Math.floor(scrollLeft.value / COL_WIDTH) - BUFFER_COLS));
const visibleEndRow = computed(() => Math.min(activeSheet.value.rowCount - 1, Math.ceil((scrollTop.value + viewportHeight.value) / ROW_HEIGHT) + BUFFER_ROWS));
const visibleEndCol = computed(() => Math.min(activeSheet.value.colCount - 1, Math.ceil((scrollLeft.value + viewportWidth.value) / COL_WIDTH) + BUFFER_COLS));
const visibleRange = computed(() => ({
  startRow: visibleStartRow.value,
  endRow: visibleEndRow.value,
  startCol: visibleStartCol.value,
  endCol: visibleEndCol.value
}));
const canvasStyle = computed(() => ({
  width: `${ROW_HEAD_WIDTH + activeSheet.value.colCount * COL_WIDTH}px`,
  height: `${COL_HEAD_HEIGHT + activeSheet.value.rowCount * ROW_HEIGHT}px`
}));
const cornerStyle = computed(() => ({ left: `${rawScrollLeft.value}px`, top: `${rawScrollTop.value}px` }));
const visibleCells = computed(() => buildVisibleCells(activeSheet.value, visibleRange.value));

/**
 * 切换工作表并回到左上角。
 * @param index 工作表索引。
 * @returns 无返回值。
 */
function selectSheet(index: number): void {
  activeIndex.value = index;
  if (!viewportRef.value) return;
  viewportRef.value.scrollTo({ left: 0, top: 0 });
  updateViewport();
}

/**
 * 更新当前可视滚动区域。
 * @returns 无返回值。
 */
function updateViewport(): void {
  const el = viewportRef.value;
  if (!el) return;
  rawScrollLeft.value = el.scrollLeft;
  rawScrollTop.value = el.scrollTop;
  scrollLeft.value = Math.max(0, el.scrollLeft - ROW_HEAD_WIDTH);
  scrollTop.value = Math.max(0, el.scrollTop - COL_HEAD_HEIGHT);
  viewportWidth.value = el.clientWidth;
  viewportHeight.value = el.clientHeight;
}

/**
 * 构建可视单元格列表。
 * @param sheet 当前工作表。
 * @returns 可渲染单元格。
 */
/**
 * 获取列头样式。
 * @param col 列号。
 * @returns CSS 样式。
 */
function colHeadStyle(col: number): Record<string, string> {
  return { left: `${ROW_HEAD_WIDTH + col * COL_WIDTH}px`, top: `${rawScrollTop.value}px`, width: `${COL_WIDTH}px` };
}

/**
 * 获取行头样式。
 * @param row 行号。
 * @returns CSS 样式。
 */
function rowHeadStyle(row: number): Record<string, string> {
  return { left: `${rawScrollLeft.value}px`, top: `${COL_HEAD_HEIGHT + row * ROW_HEIGHT}px`, height: `${ROW_HEIGHT}px` };
}

/**
 * 生成连续数字范围。
 * @param start 起始值。
 * @param end 结束值。
 * @returns 数字列表。
 */
watch(() => props.document, () => {
  activeIndex.value = 0;
  nextTick(updateViewport);
});

nextTick(updateViewport);
</script>
