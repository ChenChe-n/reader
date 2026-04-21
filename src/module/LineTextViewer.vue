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
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import type { LineTextDocument } from "../types";

const props = defineProps<{
  document: LineTextDocument;
}>();

const fixedScale = 10000n;
const rowHeight = 22;
const overscan = 16;
const rowHeightFixed = BigInt(rowHeight) * fixedScale;
const viewportRef = ref<HTMLElement | null>(null);
const viewportHeight = ref(0);
const scrollYFixed = ref(0n);
const scrollXFixed = ref(0n);
const middlePanning = ref(false);
const panStart = ref({ x: 0, y: 0, scrollX: 0n, scrollY: 0n });
const visibleRowCount = computed(() => Math.max(Math.ceil(viewportHeight.value / rowHeight), 1));
const spacerLineCount = computed(() => Math.max(visibleRowCount.value - 1, 1));
const totalLineCount = computed(() => props.document.lineCount + spacerLineCount.value);
const maxScrollYFixed = computed(() => {
  const total = BigInt(totalLineCount.value) * rowHeightFixed;
  const viewport = BigInt(Math.round(viewportHeight.value * Number(fixedScale)));
  return total > viewport ? total - viewport : 0n;
});
const topIndex = computed(() => Math.min(Number(scrollYFixed.value / rowHeightFixed), totalLineCount.value - 1));
const startIndex = computed(() => Math.max(topIndex.value - overscan, 0));
const endIndex = computed(() => {
  return Math.min(topIndex.value + visibleRowCount.value + overscan, totalLineCount.value);
});
const scrollRemainderPx = computed(() => Number(scrollYFixed.value % rowHeightFixed) / Number(fixedScale));
const offsetY = computed(() => (startIndex.value - topIndex.value) * rowHeight - scrollRemainderPx.value);
const scrollXPx = computed(() => Number(scrollXFixed.value) / Number(fixedScale));
const visibleLines = computed(() => {
  const rows: Array<{ index: number; number: string; data: string; style: Record<string, string>; spacer: boolean }> = [];
  for (let index = startIndex.value; index < endIndex.value; index += 1) {
    if (index >= props.document.lineCount) {
      rows.push({ index, number: "", data: "", style: {}, spacer: true });
      continue;
    }
    const line = props.document.lines[String(index)] || { data: "", style: {} };
    rows.push({ index, number: String(index + 1), data: line.data, style: line.style, spacer: false });
  }
  return rows;
});

/**
 * 更新可见窗口信息。
 * @returns 无返回值。
 */
function updateViewport(): void {
  if (!viewportRef.value) return;
  viewportHeight.value = viewportRef.value.clientHeight;
  clampScroll();
}

/**
 * 滚动到顶部。
 * @returns 无返回值。
 */
function scrollToTop(): void {
  scrollYFixed.value = 0n;
  scrollXFixed.value = 0n;
}

/**
 * 处理鼠标滚轮移动。
 * @param event 滚轮事件。
 * @returns 无返回值。
 */
function handleWheel(event: WheelEvent): void {
  const unit = wheelUnit(event);
  scrollBy(event.deltaX * unit, event.deltaY * unit);
}

/**
 * 开始中键拖拽平移。
 * @param event 鼠标事件。
 * @returns 无返回值。
 */
function startMiddlePan(event: MouseEvent): void {
  if (event.button !== 1) return;
  event.preventDefault();
  middlePanning.value = true;
  panStart.value = { x: event.clientX, y: event.clientY, scrollX: scrollXFixed.value, scrollY: scrollYFixed.value };
  window.addEventListener("mousemove", moveMiddlePan);
  window.addEventListener("mouseup", stopMiddlePan, { once: true });
}

/**
 * 中键拖拽时更新偏移。
 * @param event 鼠标事件。
 * @returns 无返回值。
 */
function moveMiddlePan(event: MouseEvent): void {
  if (!middlePanning.value) return;
  scrollXFixed.value = clampMin(panStart.value.scrollX + toFixed(event.clientX - panStart.value.x));
  scrollYFixed.value = clampY(panStart.value.scrollY + toFixed(event.clientY - panStart.value.y));
}

/**
 * 停止中键拖拽。
 * @returns 无返回值。
 */
function stopMiddlePan(): void {
  middlePanning.value = false;
  window.removeEventListener("mousemove", moveMiddlePan);
}

/**
 * 按像素滚动指定距离。
 * @param deltaX 横向像素。
 * @param deltaY 纵向像素。
 * @returns 无返回值。
 */
function scrollBy(deltaX: number, deltaY: number): void {
  scrollXFixed.value = clampMin(scrollXFixed.value + toFixed(deltaX));
  scrollYFixed.value = clampY(scrollYFixed.value + toFixed(deltaY));
}

/**
 * 获取滚轮单位换算。
 * @param event 滚轮事件。
 * @returns 像素单位。
 */
function wheelUnit(event: WheelEvent): number {
  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return rowHeight;
  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return Math.max(viewportHeight.value, rowHeight);
  return 1;
}

/**
 * 转换为定点像素。
 * @param pixels 像素值。
 * @returns 定点像素。
 */
function toFixed(pixels: number): bigint {
  return BigInt(Math.round(pixels * Number(fixedScale)));
}

/**
 * 限制纵向滚动范围。
 * @param value 定点像素。
 * @returns 限制后的定点像素。
 */
function clampY(value: bigint): bigint {
  if (value < 0n) return 0n;
  return value > maxScrollYFixed.value ? maxScrollYFixed.value : value;
}

/**
 * 限制最小值为 0。
 * @param value 定点像素。
 * @returns 非负定点像素。
 */
function clampMin(value: bigint): bigint {
  return value < 0n ? 0n : value;
}

/**
 * 按当前文档和视口限制滚动值。
 * @returns 无返回值。
 */
function clampScroll(): void {
  scrollYFixed.value = clampY(scrollYFixed.value);
  scrollXFixed.value = clampMin(scrollXFixed.value);
}

watch(
  () => props.document,
  async () => {
    await nextTick();
    scrollYFixed.value = 0n;
    scrollXFixed.value = 0n;
    updateViewport();
  }
);

onMounted(() => {
  updateViewport();
  window.addEventListener("resize", updateViewport);
});

onUnmounted(() => {
  window.removeEventListener("resize", updateViewport);
  window.removeEventListener("mousemove", moveMiddlePan);
});

defineExpose({ scrollToTop });
</script>
