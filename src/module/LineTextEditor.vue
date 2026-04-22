<template>
  <div
    ref="viewportRef"
    class="line-text-viewer line-text-editor line-text-viewer-wrap"
    :class="{ 'line-text-panning': middlePanning }"
    @wheel.prevent="handleWheel"
    @mousedown="startMiddlePan"
    @auxclick.prevent
  >
    <div class="line-text-window" :style="{ transform: `translateY(${offsetY}px)` }">
      <div
        v-for="line in visibleLines"
        :key="line.index"
        :class="['line-text-row', 'line-text-row-wrap', 'line-text-editor-row', { 'line-text-row-spacer': line.spacer }]"
        :style="{ minHeight: `${rowHeightPx(line.index)}px` }"
      >
        <span class="line-text-number">{{ line.number }}</span>
        <textarea
          v-if="!line.spacer"
          :ref="el => setAreaRef(line.index, el)"
          class="line-text-data line-text-editor-input"
          :style="{ ...line.style, height: `${rowHeightPx(line.index)}px` }"
          spellcheck="false"
          :value="line.data"
          @input="onLineInput(line.index, $event)"
          @keydown="onLineKeydown(line.index, $event)"
        ></textarea>
        <span v-else class="line-text-data line-text-editor-spacer"> </span>
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
import type { LineMode } from "./reader/workerLineStyles";
import { styleForLine } from "./reader/workerLineStyles";
import { buildPrefixSum, topRowIndexForScroll } from "./lineText/variablePrefixScroll";
import { useLineTextInput } from "./lineText/useLineTextInput";
import { LINE_NUMBER_GUTTER_PX } from "./lineText/lineChrome";
import { toFixed } from "./lineText/useFixedScroller";
import { useViewportResizeObserver } from "./lineText/useViewportResizeObserver";
import { logicalLinesToText, textToLogicalLines } from "./lineText/splitJoinLines";
import { useWrappedLineHeights } from "./lineText/useWrappedLineHeights";

const props = defineProps<{
  modelValue: string;
  lineMode: LineMode;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const LINE_H = 22;
const overscan = 16;
const lineNumberGutterPx = LINE_NUMBER_GUTTER_PX;
const lineDataPaddingPx = 24;

const viewportRef = ref<HTMLElement | null>(null);
const lines = ref<string[]>(textToLogicalLines(props.modelValue));

const viewportHeight = ref(0);
const viewportWidth = ref(0);
const scrollYFixed = ref(0n);
const scrollXFixed = ref(0n);

const textColumnWidth = computed(() => Math.max(1, viewportWidth.value - lineNumberGutterPx - lineDataPaddingPx));
const { lineHeights, bootstrapHeights, patchLineHeight, heightForLineText, cleanupHeights } = useWrappedLineHeights(
  {
    lineCount: () => lines.value.length,
    lineText: index => lines.value[index] ?? "",
    lineStyle: index => styleForLine(lines.value[index] ?? "", props.lineMode)
  },
  textColumnWidth,
  LINE_H,
  clampScroll
);

const visibleRowEst = computed(() => Math.max(Math.ceil(viewportHeight.value / LINE_H), 1));
const spacerLineCount = computed(() => Math.max(visibleRowEst.value - 1, 1));
const totalRowCount = computed(() => lines.value.length + spacerLineCount.value);

const fullRowHeights = computed(() => {
  const n = lines.value.length;
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

const areaRefs = new Map<number, HTMLTextAreaElement>();
function setAreaRef(index: number, el: unknown): void {
  if (el instanceof HTMLTextAreaElement) areaRefs.set(index, el);
  else areaRefs.delete(index);
}

const visibleLines = computed(() => {
  const rows: Array<{ index: number; number: string; data: string; style: Record<string, string>; spacer: boolean }> = [];
  for (let index = startIndex.value; index < endIndex.value; index += 1) {
    if (index >= lines.value.length + spacerLineCount.value) {
      rows.push({ index, number: "", data: "", style: {}, spacer: true });
    } else if (index >= lines.value.length) {
      rows.push({ index, number: "", data: "", style: {}, spacer: true });
    } else {
      const data = lines.value[index];
      rows.push({
        index,
        number: String(index + 1),
        data,
        style: styleForLine(data, props.lineMode),
        spacer: false
      });
    }
  }
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

function emitDocument(): void {
  emit("update:modelValue", logicalLinesToText(lines.value));
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

function onLineInput(index: number, event: Event): void {
  const el = event.target as HTMLTextAreaElement;
  lines.value[index] = el.value;
  patchLineHeight(index);
  emitDocument();
}

function onLineKeydown(index: number, event: KeyboardEvent): void {
  const el = event.target as HTMLTextAreaElement;
  if (event.key === "Enter") {
    event.preventDefault();
    const c = el.selectionStart ?? el.value.length;
    const left = el.value.slice(0, c);
    const right = el.value.slice(c);
    lines.value[index] = left;
    lines.value.splice(index + 1, 0, right);
    const h = lineHeights.value.slice();
    h[index] = heightForLineText(left, styleForLine(left, props.lineMode));
    h.splice(index + 1, 0, heightForLineText(right, styleForLine(right, props.lineMode)));
    lineHeights.value = h;
    emitDocument();
    nextTick(() => {
      const next = areaRefs.get(index + 1);
      next?.focus();
      next?.setSelectionRange(0, 0);
    });
    return;
  }
  if (event.key === "Backspace" && (el.selectionStart ?? 0) === 0 && (el.selectionEnd ?? 0) === 0 && index > 0) {
    event.preventDefault();
    const merged = lines.value[index - 1] + lines.value[index];
    const prevLen = lines.value[index - 1].length;
    lines.value[index - 1] = merged;
    lines.value.splice(index, 1);
    const h = lineHeights.value.slice();
    h[index - 1] = heightForLineText(merged, styleForLine(merged, props.lineMode));
    h.splice(index, 1);
    lineHeights.value = h;
    emitDocument();
    nextTick(() => {
      const prev = areaRefs.get(index - 1);
      prev?.focus();
      prev?.setSelectionRange(prevLen, prevLen);
    });
  }
}

function updateViewport(): void {
  if (!viewportRef.value) return;
  viewportHeight.value = viewportRef.value.clientHeight;
  viewportWidth.value = viewportRef.value.clientWidth;
  clampScroll();
}

watch(
  () => props.modelValue,
  v => {
    if (v === logicalLinesToText(lines.value)) return;
    lines.value = textToLogicalLines(v);
    resetScroll();
    nextTick(() => {
      updateViewport();
      bootstrapHeights();
    });
  }
);

watch(
  () => props.lineMode,
  () => {
    bootstrapHeights();
  }
);

watch(textColumnWidth, () => {
  bootstrapHeights();
});

watch(totalContentHeight, () => {
  clampScroll();
});

useViewportResizeObserver(viewportRef, () => {
  updateViewport();
});

onMounted(() => {
  updateViewport();
  bootstrapHeights();
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
