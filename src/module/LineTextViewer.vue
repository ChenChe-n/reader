<template>
  <div
    ref="viewportRef"
    class="line-text-viewer line-text-viewer-wrap"
    :class="{ 'line-text-panning': middlePanning }"
    @wheel.prevent="handleWheel"
    @mousedown="startMiddlePan"
    @auxclick.prevent
  >
    <div class="line-text-window" :style="{ transform: `translateY(${offsetY}px)` }">
      <div
        v-for="line in visibleLines"
        :key="line.index"
        :class="['line-text-row', 'line-text-row-wrap', { 'line-text-row-spacer': line.spacer }]"
        :style="{ minHeight: `${rowHeightPx(line.index)}px` }"
      >
        <span class="line-text-number">{{ line.number }}</span>
        <span class="line-text-data" :style="line.style">{{ line.data || " " }}</span>
      </div>
    </div>
    <button
      class="line-scrollbar line-scrollbar-y"
      type="button"
      :style="{ height: `${verticalThumb.height}px`, transform: `translateY(${verticalThumb.top}px)` }"
      aria-label="垂直滚动条"
      @mousedown.stop.prevent="startThumbDrag('y', $event)"
    ></button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { LineTextDocument } from "../types";
import { buildPrefixSum, topRowIndexForScroll } from "./lineText/variablePrefixScroll";
import { useLineTextInput } from "./lineText/useLineTextInput";
import { LINE_NUMBER_GUTTER_PX } from "./lineText/lineChrome";
import { toFixed } from "./lineText/useFixedScroller";
import { useViewportResizeObserver } from "./lineText/useViewportResizeObserver";
import { useWrappedLineHeights } from "./lineText/useWrappedLineHeights";

const props = defineProps<{
  document: LineTextDocument;
}>();

const LINE_H = 22;
const overscan = 16;
const lineNumberGutterPx = LINE_NUMBER_GUTTER_PX;
const lineDataPaddingPx = 24;
const viewportRef = ref<HTMLElement | null>(null);
const viewportHeight = ref(0);
const viewportWidth = ref(0);
const scrollYFixed = ref(0n);
const scrollXFixed = ref(0n);

const textColumnWidth = computed(() => Math.max(1, viewportWidth.value - lineNumberGutterPx - lineDataPaddingPx));
const { lineHeights, bootstrapHeights, cleanupHeights } = useWrappedLineHeights(
  {
    lineCount: () => props.document.lineCount,
    lineText: index => lineForIndex(index).data,
    lineStyle: index => lineForIndex(index).style
  },
  textColumnWidth,
  LINE_H,
  clampScroll
);

const visibleRowEst = computed(() => Math.max(Math.ceil(viewportHeight.value / LINE_H), 1));
const spacerLineCount = computed(() => Math.max(visibleRowEst.value - 1, 1));
const totalRowCount = computed(() => props.document.lineCount + spacerLineCount.value);

const fullRowHeights = computed(() => {
  const n = props.document.lineCount;
  const sp = spacerLineCount.value;
  const h = lineHeights.value;
  const rows: number[] = [];
  for (let i = 0; i < n; i += 1) rows.push(i < h.length && h[i] > 0 ? h[i] : LINE_H);
  for (let j = 0; j < sp; j += 1) rows.push(LINE_H);
  return rows;
});

const prefixSum = computed(() => buildPrefixSum(fullRowHeights.value));
const totalContentHeight = computed(() => {
  const p = prefixSum.value;
  return p.length ? p[p.length - 1] : 0;
});

const scrollYPx = computed(() => Number(scrollYFixed.value) / 10000);

const maxScrollYFixed = computed(() => toFixed(Math.max(0, totalContentHeight.value - viewportHeight.value)));
const maxScrollXFixed = computed(() => 0n);

const topIndex = computed(() => topRowIndexForScroll(prefixSum.value, scrollYPx.value, totalRowCount.value));

const startIndex = computed(() => Math.max(topIndex.value - overscan, 0));
const endIndex = computed(() => Math.min(startIndex.value + visibleRowEst.value + overscan * 2, totalRowCount.value));

const offsetY = computed(() => {
  const p = prefixSum.value;
  const s = startIndex.value;
  if (s >= p.length - 1) return -scrollYPx.value;
  return p[s] - scrollYPx.value;
});

const verticalThumb = computed(() =>
  buildThumb(
    viewportHeight.value,
    viewportHeight.value / Math.max(totalContentHeight.value, viewportHeight.value),
    scrollYFixed.value,
    maxScrollYFixed.value
  )
);

const visibleLines = computed(() => {
  const rows: Array<{ index: number; number: string; data: string; style: Record<string, string>; spacer: boolean }> = [];
  for (let index = startIndex.value; index < endIndex.value; index += 1) rows.push(rowForIndex(index));
  return rows;
});

function rowHeightPx(index: number): number {
  return fullRowHeights.value[index] ?? LINE_H;
}

function buildThumb(track: number, ratio: number, scroll: bigint, maxScroll: bigint): { width: number; height: number; left: number; top: number } {
  const size = Math.max(Math.min(track - 4, (track - 4) * ratio), 28);
  const range = Math.max(track - 4 - size, 0);
  const offset = maxScroll ? Number((scroll * BigInt(Math.round(range * 10000))) / maxScroll) / 10000 : 0;
  return { width: size, height: size, left: offset + 2, top: offset + 2 };
}

function rowForIndex(index: number): { index: number; number: string; data: string; style: Record<string, string>; spacer: boolean } {
  if (index >= props.document.lineCount + spacerLineCount.value) {
    return { index, number: "", data: "", style: {}, spacer: true };
  }
  if (index >= props.document.lineCount) {
    return { index, number: "", data: "", style: {}, spacer: true };
  }
  const line = props.document.lines[String(index)] || { data: "", style: {} };
  return { index, number: String(index + 1), data: line.data, style: line.style, spacer: false };
}

/**
 * 获取文档原始行数据。
 * @param index 行索引。
 * @returns 行文本和样式。
 */
function lineForIndex(index: number): { data: string; style: Record<string, string> } {
  return props.document.lines[String(index)] || { data: "", style: {} };
}

function clampScroll(): void {
  scrollYFixed.value = clampBig(scrollYFixed.value, maxScrollYFixed.value);
  scrollXFixed.value = 0n;
}

function clampBig(value: bigint, max: bigint): bigint {
  if (value < 0n) return 0n;
  return value > max ? max : value;
}

function resetScroll(): void {
  scrollYFixed.value = 0n;
  scrollXFixed.value = 0n;
}

function restartForDocument(): void {
  bootstrapHeights();
}

function updateViewport(): void {
  if (!viewportRef.value) return;
  viewportHeight.value = viewportRef.value.clientHeight;
  viewportWidth.value = viewportRef.value.clientWidth;
  clampScroll();
}

const { middlePanning, handleWheel, startMiddlePan, startThumbDrag, cleanupInput } = useLineTextInput({
  rowHeight: LINE_H,
  viewportHeight: () => viewportHeight.value,
  viewportWidth: () => viewportWidth.value,
  scrollXFixed,
  scrollYFixed,
  maxScrollXFixed: () => maxScrollXFixed.value,
  maxScrollYFixed: () => maxScrollYFixed.value,
  verticalThumbSize: () => verticalThumb.value.height,
  horizontalThumbSize: () => 28
});

watch(
  () => props.document,
  async () => {
    await nextTick();
    resetScroll();
    updateViewport();
    restartForDocument();
  }
);

watch(textColumnWidth, () => {
  restartForDocument();
});

watch(totalContentHeight, () => {
  clampScroll();
});

useViewportResizeObserver(viewportRef, () => {
  updateViewport();
});

onMounted(() => {
  updateViewport();
  restartForDocument();
});

onUnmounted(() => {
  cleanupHeights();
  cleanupInput();
});

function scrollToTop(): void {
  resetScroll();
}

defineExpose({ scrollToTop });
</script>
