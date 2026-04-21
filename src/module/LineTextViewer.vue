<template>
  <div ref="scrollerRef" class="line-text-viewer" @scroll="updateViewport">
    <div class="line-text-spacer" :style="{ height: `${totalHeight}px` }">
      <div class="line-text-window" :style="{ transform: `translateY(${offsetY}px)` }">
        <div v-for="line in visibleLines" :key="line.index" :class="['line-text-row', { 'line-text-row-spacer': line.spacer }]">
          <span class="line-text-number">{{ line.number }}</span>
          <span class="line-text-data" :style="line.style">{{ line.data || ' ' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from "vue";
import type { LineTextDocument } from "../types";

const props = defineProps<{
  document: LineTextDocument;
}>();

const maxPhysicalHeight = 8_000_000;
const rowHeight = 22;
const overscan = 16;
const scrollerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);
const visibleRowCount = computed(() => Math.max(Math.ceil(viewportHeight.value / rowHeight), 1));
const spacerLineCount = computed(() => Math.max(visibleRowCount.value - 1, 1));
const totalLineCount = computed(() => props.document.lineCount + spacerLineCount.value);
const totalLogicalHeight = computed(() => totalLineCount.value * rowHeight);
const totalHeight = computed(() => Math.min(totalLogicalHeight.value, maxPhysicalHeight));
const physicalScrollRange = computed(() => Math.max(totalHeight.value - viewportHeight.value, 0));
const maxTopIndex = computed(() => Math.max(totalLineCount.value - visibleRowCount.value, 0));
const scrollRatio = computed(() => (physicalScrollRange.value ? scrollTop.value / physicalScrollRange.value : 0));
const topIndex = computed(() => Math.min(Math.round(scrollRatio.value * maxTopIndex.value), maxTopIndex.value));
const startIndex = computed(() => Math.max(topIndex.value - overscan, 0));
const endIndex = computed(() => {
  return Math.min(topIndex.value + visibleRowCount.value + overscan, totalLineCount.value);
});
const offsetY = computed(() => Math.max(scrollTop.value - (topIndex.value - startIndex.value) * rowHeight, 0));
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
  const scroller = scrollerRef.value;
  if (!scroller) return;
  scrollTop.value = scroller.scrollTop;
  viewportHeight.value = scroller.clientHeight;
}

/**
 * 滚动到顶部。
 * @returns 无返回值。
 */
function scrollToTop(): void {
  scrollerRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}

watch(
  () => props.document,
  async () => {
    await nextTick();
    if (scrollerRef.value) scrollerRef.value.scrollTop = 0;
    updateViewport();
  }
);

onMounted(updateViewport);
defineExpose({ scrollToTop });
</script>
