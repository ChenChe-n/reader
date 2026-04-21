import { computed, ref } from "vue";

const fixedScale = 10000n;

/**
 * 创建定点数虚拟滚动状态。
 * @param rowHeight 行高。
 * @param lineCount 总行数。
 * @param spacerLines 末尾占位行数。
 * @returns 虚拟滚动状态和操作。
 */
export function useFixedScroller(rowHeight: number, lineCount: () => number, spacerLines: () => number) {
  const rowHeightFixed = BigInt(rowHeight) * fixedScale;
  const viewportHeight = ref(0);
  const viewportWidth = ref(0);
  const contentWidth = ref(0);
  const scrollYFixed = ref(0n);
  const scrollXFixed = ref(0n);
  const totalLineCount = computed(() => lineCount() + spacerLines());
  const visibleRowCount = computed(() => Math.max(Math.ceil(viewportHeight.value / rowHeight), 1));
  const maxScrollYFixed = computed(() => {
    const total = BigInt(totalLineCount.value) * rowHeightFixed;
    const viewport = BigInt(Math.round(viewportHeight.value * Number(fixedScale)));
    return total > viewport ? total - viewport : 0n;
  });
  const maxScrollXFixed = computed(() => toFixed(Math.max(contentWidth.value - viewportWidth.value, 0)));
  const topIndex = computed(() => Math.min(Number(scrollYFixed.value / rowHeightFixed), totalLineCount.value - 1));
  const scrollRemainderPx = computed(() => Number(scrollYFixed.value % rowHeightFixed) / Number(fixedScale));
  const scrollXPx = computed(() => Number(scrollXFixed.value) / Number(fixedScale));

  /**
   * 按像素滚动指定距离。
   * @param deltaX 横向像素。
   * @param deltaY 纵向像素。
   * @returns 无返回值。
   */
  function scrollBy(deltaX: number, deltaY: number): void {
    scrollXFixed.value = clamp(scrollXFixed.value + toFixed(deltaX), maxScrollXFixed.value);
    scrollYFixed.value = clamp(scrollYFixed.value + toFixed(deltaY), maxScrollYFixed.value);
  }

  /**
   * 重置滚动。
   * @returns 无返回值。
   */
  function resetScroll(): void {
    scrollYFixed.value = 0n;
    scrollXFixed.value = 0n;
  }

  /**
   * 根据当前范围裁剪滚动。
   * @returns 无返回值。
   */
  function clampScroll(): void {
    scrollYFixed.value = clamp(scrollYFixed.value, maxScrollYFixed.value);
    scrollXFixed.value = clamp(scrollXFixed.value, maxScrollXFixed.value);
  }

  return {
    viewportHeight,
    viewportWidth,
    contentWidth,
    scrollYFixed,
    scrollXFixed,
    totalLineCount,
    visibleRowCount,
    maxScrollYFixed,
    maxScrollXFixed,
    topIndex,
    scrollRemainderPx,
    scrollXPx,
    scrollBy,
    resetScroll,
    clampScroll,
    toFixed
  };
}

/**
 * 转换为定点像素。
 * @param pixels 像素值。
 * @returns 定点像素。
 */
export function toFixed(pixels: number): bigint {
  return BigInt(Math.round(pixels * Number(fixedScale)));
}

/**
 * 限制滚动范围。
 * @param value 当前滚动值。
 * @param max 最大滚动值。
 * @returns 限制后的滚动值。
 */
function clamp(value: bigint, max: bigint): bigint {
  if (value < 0n) return 0n;
  return value > max ? max : value;
}
