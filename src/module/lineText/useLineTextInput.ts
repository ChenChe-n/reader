import { ref } from "vue";
import { toFixed } from "./useFixedScroller";

export interface LineTextInputContext {
  rowHeight: number;
  viewportHeight: () => number;
  viewportWidth: () => number;
  scrollXFixed: { value: bigint };
  scrollYFixed: { value: bigint };
  maxScrollXFixed: () => bigint;
  maxScrollYFixed: () => bigint;
  verticalThumbSize: () => number;
  horizontalThumbSize: () => number;
}

/**
 * 创建行文本输入交互。
 * @param context 输入上下文。
 * @returns 交互状态和事件处理。
 */
export function useLineTextInput(context: LineTextInputContext) {
  const middlePanning = ref(false);
  const thumbDrag = ref<{ axis: "x" | "y"; start: number; scroll: bigint } | null>(null);
  const panStart = ref({ x: 0, y: 0, scrollX: 0n, scrollY: 0n });

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
    panStart.value = { x: event.clientX, y: event.clientY, scrollX: context.scrollXFixed.value, scrollY: context.scrollYFixed.value };
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
    context.scrollXFixed.value = clamp(panStart.value.scrollX + toFixed(event.clientX - panStart.value.x), context.maxScrollXFixed());
    context.scrollYFixed.value = clamp(panStart.value.scrollY + toFixed(event.clientY - panStart.value.y), context.maxScrollYFixed());
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
   * 开始拖动自绘滚动条。
   * @param axis 滚动轴。
   * @param event 鼠标事件。
   * @returns 无返回值。
   */
  function startThumbDrag(axis: "x" | "y", event: MouseEvent): void {
    thumbDrag.value = { axis, start: axis === "y" ? event.clientY : event.clientX, scroll: axis === "y" ? context.scrollYFixed.value : context.scrollXFixed.value };
    window.addEventListener("mousemove", moveThumbDrag);
    window.addEventListener("mouseup", stopThumbDrag, { once: true });
  }

  /**
   * 拖动自绘滚动条。
   * @param event 鼠标事件。
   * @returns 无返回值。
   */
  function moveThumbDrag(event: MouseEvent): void {
    if (!thumbDrag.value) return;
    const axis = thumbDrag.value.axis;
    const current = axis === "y" ? event.clientY : event.clientX;
    const delta = current - thumbDrag.value.start;
    if (axis === "y") context.scrollYFixed.value = dragToScroll(delta, thumbDrag.value.scroll, context.viewportHeight(), context.verticalThumbSize(), context.maxScrollYFixed());
    else context.scrollXFixed.value = dragToScroll(delta, thumbDrag.value.scroll, context.viewportWidth(), context.horizontalThumbSize(), context.maxScrollXFixed());
  }

  /**
   * 停止拖动自绘滚动条。
   * @returns 无返回值。
   */
  function stopThumbDrag(): void {
    thumbDrag.value = null;
    window.removeEventListener("mousemove", moveThumbDrag);
  }

  /**
   * 按像素滚动指定距离。
   * @param deltaX 横向像素。
   * @param deltaY 纵向像素。
   * @returns 无返回值。
   */
  function scrollBy(deltaX: number, deltaY: number): void {
    context.scrollXFixed.value = clamp(context.scrollXFixed.value + toFixed(deltaX), context.maxScrollXFixed());
    context.scrollYFixed.value = clamp(context.scrollYFixed.value + toFixed(deltaY), context.maxScrollYFixed());
  }

  /**
   * 清理事件监听。
   * @returns 无返回值。
   */
  function cleanupInput(): void {
    window.removeEventListener("mousemove", moveMiddlePan);
    window.removeEventListener("mousemove", moveThumbDrag);
  }

  return { middlePanning, handleWheel, startMiddlePan, startThumbDrag, cleanupInput };

  function wheelUnit(event: WheelEvent): number {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return context.rowHeight;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return Math.max(context.viewportHeight(), context.rowHeight);
    return 1;
  }
}

function dragToScroll(delta: number, start: bigint, trackSize: number, thumbSize: number, maxScroll: bigint): bigint {
  const range = Math.max(trackSize - thumbSize, 1);
  return clamp(start + (toFixed(delta) * maxScroll) / toFixed(range), maxScroll);
}

function clamp(value: bigint, max: bigint): bigint {
  if (value < 0n) return 0n;
  return value > max ? max : value;
}
