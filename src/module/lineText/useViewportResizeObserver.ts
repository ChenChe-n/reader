import { onUnmounted, watch, type Ref } from "vue";

/**
 * 监听预览区根节点尺寸变化（侧栏拖拽、最大化/还原、折叠等），
 * 合并到下一帧再回调；避免仅依赖 window.resize 导致布局缓存不更新。
 * @param viewportRef 预览视口根元素。
 * @param onInvalidate 尺寸变化后的刷新（应更新 client 宽高并触发换行高度等重算）。
 */
export function useViewportResizeObserver(viewportRef: Ref<HTMLElement | null>, onInvalidate: () => void): void {
  let ro: ResizeObserver | null = null;
  let raf = 0;

  function flush(): void {
    raf = 0;
    onInvalidate();
  }

  function schedule(): void {
    if (raf) return;
    raf = requestAnimationFrame(flush);
  }

  watch(
    viewportRef,
    el => {
      ro?.disconnect();
      ro = null;
      schedule();
      if (el && typeof ResizeObserver !== "undefined") {
        ro = new ResizeObserver(() => schedule());
        ro.observe(el);
      }
    },
    { flush: "post" }
  );

  onUnmounted(() => {
    if (raf) cancelAnimationFrame(raf);
    ro?.disconnect();
    ro = null;
  });
}
