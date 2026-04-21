<template>
  <div
    ref="viewportRef"
    class="line-text-viewer"
    :class="{ 'line-text-panning': middlePanning }"
    :style="{ '--line-text-x': `${scrollXPx}px` }"
    @wheel.prevent="handleWheel"
    @mousedown="startMiddlePan"
    @auxclick.prevent
  >
    <div class="line-text-window" :style="{ transform: `translateY(${offsetY}px)` }">
      <div v-for="line in visibleLines" :key="line.index" :class="['line-text-row', { 'line-text-row-spacer': line.spacer }]">
        <span class="line-text-number">{{ line.number }}</span>
        <span class="line-text-data" :style="line.style">{{ line.data || ' ' }}</span>
      </div>
    </div>
    <button
      class="line-scrollbar line-scrollbar-y"
      type="button"
      :style="{ height: `${verticalThumb.height}px`, transform: `translateY(${verticalThumb.top}px)` }"
      aria-label="垂直滚动条"
      @mousedown.stop.prevent="startThumbDrag('y', $event)"
    ></button>
    <button
      class="line-scrollbar line-scrollbar-x"
      type="button"
      :style="{ width: `${horizontalThumb.width}px`, transform: `translateX(${horizontalThumb.left}px)` }"
      aria-label="水平滚动条"
      @mousedown.stop.prevent="startThumbDrag('x', $event)"
    ></button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { LineTextDocument } from "../types";
import { useFixedScroller } from "./lineText/useFixedScroller";
import { useLineTextInput } from "./lineText/useLineTextInput";

const props = defineProps<{
  document: LineTextDocument;
}>();

const rowHeight = 22;
const overscan = 16;
const viewportRef = ref<HTMLElement | null>(null);
const spacerLineCount = computed(() => Math.max(scroller.visibleRowCount.value - 1, 1));
const scroller = useFixedScroller(rowHeight, () => props.document.lineCount, () => spacerLineCount.value);
const {
  viewportHeight,
  viewportWidth,
  contentWidth,
  scrollXFixed,
  scrollYFixed,
  visibleRowCount,
  totalLineCount,
  maxScrollXFixed,
  maxScrollYFixed,
  topIndex,
  scrollRemainderPx,
  scrollXPx,
  resetScroll,
  clampScroll
} = scroller;
const { middlePanning, handleWheel, startMiddlePan, startThumbDrag, cleanupInput } = useLineTextInput({
  rowHeight,
  viewportHeight: () => viewportHeight.value,
  viewportWidth: () => viewportWidth.value,
  scrollXFixed,
  scrollYFixed,
  maxScrollXFixed: () => maxScrollXFixed.value,
  maxScrollYFixed: () => maxScrollYFixed.value,
  verticalThumbSize: () => verticalThumb.value.height,
  horizontalThumbSize: () => horizontalThumb.value.width
});
const startIndex = computed(() => Math.max(topIndex.value - overscan, 0));
const endIndex = computed(() => Math.min(topIndex.value + visibleRowCount.value + overscan, totalLineCount.value));
const offsetY = computed(() => (startIndex.value - topIndex.value) * rowHeight - scrollRemainderPx.value);
const verticalThumb = computed(() => buildThumb(viewportHeight.value, visibleRowCount.value / totalLineCount.value, scrollYFixed.value, maxScrollYFixed.value));
const horizontalThumb = computed(() => {
  const ratio = viewportWidth.value / Math.max(contentWidth.value, viewportWidth.value);
  return buildThumb(viewportWidth.value, ratio, scrollXFixed.value, maxScrollXFixed.value);
});
const visibleLines = computed(() => {
  const rows: Array<{ index: number; number: string; data: string; style: Record<string, string>; spacer: boolean }> = [];
  for (let index = startIndex.value; index < endIndex.value; index += 1) rows.push(rowForIndex(index));
  return rows;
});

/**
 * 更新可见窗口信息。
 * @returns 无返回值。
 */
function updateViewport(): void {
  if (!viewportRef.value) return;
  viewportHeight.value = viewportRef.value.clientHeight;
  viewportWidth.value = viewportRef.value.clientWidth;
  contentWidth.value = measureContentWidth();
  clampScroll();
}

/**
 * 滚动到顶部。
 * @returns 无返回值。
 */
function scrollToTop(): void {
  resetScroll();
}

/**
 * 生成指定索引的可见行。
 * @param index 行索引。
 * @returns 可见行。
 */
function rowForIndex(index: number): { index: number; number: string; data: string; style: Record<string, string>; spacer: boolean } {
  if (index >= props.document.lineCount) return { index, number: "", data: "", style: {}, spacer: true };
  const line = props.document.lines[String(index)] || { data: "", style: {} };
  return { index, number: String(index + 1), data: line.data, style: line.style, spacer: false };
}

/**
 * 创建滚动条滑块尺寸和位置。
 * @param track 轨道长度。
 * @param ratio 可见比例。
 * @param scroll 当前滚动。
 * @param maxScroll 最大滚动。
 * @returns 滑块信息。
 */
function buildThumb(track: number, ratio: number, scroll: bigint, maxScroll: bigint): { width: number; height: number; left: number; top: number } {
  const size = Math.max(Math.min(track - 4, (track - 4) * ratio), 28);
  const range = Math.max(track - 4 - size, 0);
  const offset = maxScroll ? Number((scroll * BigInt(Math.round(range * 10000))) / maxScroll) / 10000 : 0;
  return { width: size, height: size, left: offset + 2, top: offset + 2 };
}

/**
 * 估算当前文档最长可视行宽度。
 * @returns 内容宽度。
 */
function measureContentWidth(): number {
  let maxLength = 0;
  for (const line of Object.values(props.document.lines)) maxLength = Math.max(maxLength, line.data.length);
  return 72 + maxLength * 8 + 24;
}

watch(
  () => props.document,
  async () => {
    await nextTick();
    resetScroll();
    updateViewport();
  }
);

onMounted(() => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateViewport);
  cleanupInput();
});

defineExpose({ scrollToTop });
</script>
