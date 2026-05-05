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
        <span class="line-text-data" :style="line.style"><template v-if="line.chunks.length"><span v-for="chunk in line.chunks" :key="chunk.key" :class="chunk.className" :style="chunk.style">{{ chunk.text }}</span></template><template v-else>{{ line.data || " " }}</template></span>
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
import type { LineTextDocument, LineTextSpan } from "../types";
import { buildPrefixSum, topRowIndexForScroll } from "./lineText/variablePrefixScroll";
import { useLineTextInput } from "./lineText/useLineTextInput";
import { LINE_NUMBER_GUTTER_PX } from "./lineText/lineChrome";
import { toFixed } from "./lineText/useFixedScroller";
import { useViewportResizeObserver } from "./lineText/useViewportResizeObserver";
import { useWrappedLineHeights } from "./lineText/useWrappedLineHeights";

const props = defineProps<{
  document: LineTextDocument;
  searchQuery?: string;
  activeSearchLine?: number;
  activeSearchStart?: number;
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

interface VisibleLine {
  index: number;
  number: string;
  data: string;
  style: Record<string, string>;
  chunks: LineTextChunk[];
  spacer: boolean;
}

interface LineTextChunk {
  key: string;
  text: string;
  style: Record<string, string>;
  className?: string;
}

const visibleLines = computed(() => {
  const rows: VisibleLine[] = [];
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

function rowForIndex(index: number): VisibleLine {
  if (index >= props.document.lineCount + spacerLineCount.value) {
    return { index, number: "", data: "", style: {}, chunks: [], spacer: true };
  }
  if (index >= props.document.lineCount) {
    return { index, number: "", data: "", style: {}, chunks: [], spacer: true };
  }
  const line = props.document.lines[String(index)] || { data: "", style: {} };
  return { index, number: String(index + 1), data: line.data, style: line.style, chunks: chunksForLine(index, line.data, line.spans), spacer: false };
}

/**
 * 获取文档原始行数据。
 * @param index 行索引。
 * @returns 行文本和样式。
 */
function lineForIndex(index: number): { data: string; style: Record<string, string> } {
  return props.document.lines[String(index)] || { data: "", style: {} };
}

function chunksForLine(lineIndex: number, data: string, spans: LineTextSpan[] | undefined): LineTextChunk[] {
  const chunks: LineTextChunk[] = [];
  const baseChunks = chunksForSyntax(data, spans);
  const matches = searchRangesForLine(data);
  if (!matches.length) return baseChunks;
  let keyIndex = 0;
  for (const chunk of baseChunks) {
    const start = keyIndex;
    const end = start + chunk.text.length;
    chunks.push(...splitChunkBySearch(lineIndex, chunk, start, end));
    keyIndex = end;
  }
  return chunks;
}

function chunksForSyntax(data: string, spans: LineTextSpan[] | undefined): LineTextChunk[] {
  if (!spans?.length) return data ? [{ key: "plain", text: data, style: {} }] : [];
  const chunks: LineTextChunk[] = [];
  let cursor = 0;
  spans.forEach((span, index) => {
    const start = Math.max(0, Math.min(span.start, data.length));
    const end = Math.max(start, Math.min(span.end, data.length));
    if (start > cursor) chunks.push({ key: `plain-${index}`, text: data.slice(cursor, start), style: {} });
    if (end > start) chunks.push({ key: `span-${index}`, text: data.slice(start, end), style: span.style });
    cursor = end;
  });
  if (cursor < data.length) chunks.push({ key: "plain-tail", text: data.slice(cursor), style: {} });
  return chunks;
}

function searchRangesForLine(data: string): Array<{ start: number; end: number }> {
  const query = normalizedSearchQuery();
  if (!query) return [];
  const source = data.toLocaleLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];
  let index = source.indexOf(query);
  while (index >= 0) {
    ranges.push({ start: index, end: index + query.length });
    index = source.indexOf(query, index + query.length);
  }
  return ranges;
}

function splitChunkBySearch(lineIndex: number, chunk: LineTextChunk, chunkStart: number, chunkEnd: number): LineTextChunk[] {
  const ranges = searchRangesForLine(lineForIndex(lineIndex).data).filter(range => range.end > chunkStart && range.start < chunkEnd);
  if (!ranges.length) return [chunk];
  const result: LineTextChunk[] = [];
  let cursor = chunkStart;
  for (const range of ranges) {
    const start = Math.max(range.start, chunkStart);
    const end = Math.min(range.end, chunkEnd);
    if (start > cursor) {
      result.push({ key: `${chunk.key}-plain-${cursor}`, text: chunk.text.slice(cursor - chunkStart, start - chunkStart), style: chunk.style });
    }
    result.push({
      key: `${chunk.key}-match-${start}`,
      text: chunk.text.slice(start - chunkStart, end - chunkStart),
      style: chunk.style,
      className: searchClassName(lineIndex, start)
    });
    cursor = end;
  }
  if (cursor < chunkEnd) {
    result.push({ key: `${chunk.key}-plain-${cursor}`, text: chunk.text.slice(cursor - chunkStart), style: chunk.style });
  }
  return result;
}

function normalizedSearchQuery(): string {
  return (props.searchQuery || "").trim().toLocaleLowerCase();
}

function searchClassName(lineIndex: number, start: number): string {
  return lineIndex === props.activeSearchLine && start === props.activeSearchStart
    ? "line-search-match line-search-match-active"
    : "line-search-match";
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

function scrollTop(): number {
  return scrollYPx.value;
}

function setScrollTop(top: number): void {
  scrollYFixed.value = clampBig(toFixed(Math.max(0, top)), maxScrollYFixed.value);
}

function scrollToLine(lineNumber: number): void {
  const index = Math.max(0, Math.min(Math.trunc(lineNumber) - 1, props.document.lineCount - 1));
  const top = prefixSum.value[index] ?? 0;
  scrollYFixed.value = clampBig(toFixed(top), maxScrollYFixed.value);
}

defineExpose({ scrollToTop, scrollToLine, scrollTop, setScrollTop });
</script>
