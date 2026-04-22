import { ref, type Ref } from "vue";
import { heuristicWrappedHeightPx, wrappedBlockHeightPx } from "./pretextWrapHeight";

interface WrappedLineSource {
  lineCount: () => number;
  lineText: (index: number) => string;
  lineStyle: (index: number) => Record<string, string>;
}

/**
 * 管理自动换行行文本的估算高度和空闲精确测量。
 * @param source 行文本数据源。
 * @param textColumnWidth 文本列宽度。
 * @param rowHeight 基础行高。
 * @param clampScroll 高度变化后校正滚动位置。
 * @returns 行高状态和测量控制方法。
 */
export function useWrappedLineHeights(
  source: WrappedLineSource,
  textColumnWidth: Ref<number>,
  rowHeight: number,
  clampScroll: () => void
) {
  const lineHeights = ref<number[]>([]);
  const measurePassGen = ref(0);
  let idleHeightsHandle: number | null = null;

  /**
   * 计算单行文本的精确换行高度。
   * @param text 行文本。
   * @param style 行样式。
   * @returns 像素高度。
   */
  function heightForLineText(text: string, style: Record<string, string>): number {
    return wrappedBlockHeightPx(text, style, textColumnWidth.value, rowHeight);
  }

  /**
   * 取消等待中的空闲测量任务。
   * @returns 无返回值。
   */
  function cancelIdleHeights(): void {
    if (idleHeightsHandle === null) return;
    cancelIdleCallback(idleHeightsHandle);
    idleHeightsHandle = null;
  }

  /**
   * 为当前数据源快速建立估算高度，再安排精确测量。
   * @returns 无返回值。
   */
  function bootstrapHeights(): void {
    measurePassGen.value += 1;
    const gen = measurePassGen.value;
    cancelIdleHeights();
    const wrapW = textColumnWidth.value;
    const count = source.lineCount();
    const arr = new Array(count);
    for (let i = 0; i < count; i += 1) {
      arr[i] = heuristicWrappedHeightPx(source.lineText(i).length, wrapW, rowHeight);
    }
    lineHeights.value = arr;
    clampScroll();
    schedulePreciseHeights(gen);
  }

  /**
   * 更新单行精确高度。
   * @param index 行号。
   * @returns 无返回值。
   */
  function patchLineHeight(index: number): void {
    const h = lineHeights.value.slice();
    h[index] = heightForLineText(source.lineText(index), source.lineStyle(index));
    lineHeights.value = h;
    clampScroll();
  }

  /**
   * 清理测量任务并使旧任务失效。
   * @returns 无返回值。
   */
  function cleanupHeights(): void {
    measurePassGen.value += 1;
    cancelIdleHeights();
  }

  /**
   * 使用 requestIdleCallback 分批执行精确高度测量。
   * @param gen 当前测量代数。
   * @returns 无返回值。
   */
  function schedulePreciseHeights(gen: number): void {
    const count = source.lineCount();
    const arr = lineHeights.value.length === count ? lineHeights.value.slice() : new Array(count);
    let i = 0;
    const step: IdleRequestCallback = deadline => {
      if (measurePassGen.value !== gen) return;
      let batch = 0;
      while (i < count && batch < 256) {
        arr[i] = heightForLineText(source.lineText(i), source.lineStyle(i));
        i += 1;
        batch += 1;
        if (deadline.timeRemaining() < 2 && i < count && batch >= 64) break;
      }
      lineHeights.value = arr;
      clampScroll();
      if (i >= count) {
        idleHeightsHandle = null;
        return;
      }
      idleHeightsHandle = requestIdleCallback(step, { timeout: 120 });
    };
    idleHeightsHandle = requestIdleCallback(step, { timeout: 120 });
  }

  return { lineHeights, bootstrapHeights, patchLineHeight, heightForLineText, cleanupHeights };
}
