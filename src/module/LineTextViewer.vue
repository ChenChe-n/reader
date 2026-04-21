<template>
  <div ref="scrollerRef" class="line-text-viewer" @scroll="updateViewport">
    <div class="line-text-spacer" :style="{ height: `${totalHeight}px` }">
      <div class="line-text-window" :style="{ transform: `translateY(${offsetY}px)` }">
        <div v-for="line in visibleLines" :key="line.index" class="line-text-row">
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

const rowHeight = 22;
const overscan = 16;
const scrollerRef = ref<HTMLElement | null>(null);
const scrollTop = ref(0);
const viewportHeight = ref(0);
const bottomScrollPadding = computed(() => Math.max(viewportHeight.value, rowHeight));
const totalHeight = computed(() => props.document.lineCount * rowHeight + bottomScrollPadding.value);
const startIndex = computed(() => Math.max(Math.floor(scrollTop.value / rowHeight) - overscan, 0));
const endIndex = computed(() => {
  const visibleCount = Math.ceil(viewportHeight.value / rowHeight) + overscan * 2;
  return Math.min(startIndex.value + visibleCount, props.document.lineCount);
});
const offsetY = computed(() => startIndex.value * rowHeight);
const visibleLines = computed(() => {
  const rows: Array<{ index: number; number: number; data: string; style: Record<string, string> }> = [];
  for (let index = startIndex.value; index < endIndex.value; index += 1) {
    const line = props.document.lines[String(index)] || { data: "", style: {} };
    rows.push({ index, number: index + 1, data: line.data, style: line.style });
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
