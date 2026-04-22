import { computed, onMounted, onUnmounted, ref } from "vue";

/**
 * 管理阅读器主布局的侧栏拖拽、折叠、最大化和窄屏状态。
 * @returns 布局相关响应式状态和事件处理函数。
 */
export function useResponsiveLayout() {
  const layoutRef = ref<HTMLElement | null>(null);
  const resizerRef = ref<HTMLButtonElement | null>(null);
  const resizing = ref(false);
  const sidebarCollapsed = ref(false);
  const previewMaximized = ref(false);
  const narrowLayout = ref(false);
  const shouldShowPreview = computed(() => !narrowLayout.value || sidebarCollapsed.value || previewMaximized.value);
  const layoutClass = computed(() => ({
    layout: true,
    resizing: resizing.value,
    "sidebar-collapsed": sidebarCollapsed.value,
    "preview-maximized": previewMaximized.value,
    "preview-hidden": !shouldShowPreview.value
  }));

  let cleanupNarrowLayout: (() => void) | null = null;

  /**
   * 开始拖拽调整侧栏宽度。
   * @param event 指针事件。
   * @returns 无返回值。
   */
  function startResize(event: PointerEvent): void {
    if (sidebarCollapsed.value || previewMaximized.value || narrowLayout.value) return;
    resizing.value = true;
    resizerRef.value?.setPointerCapture(event.pointerId);
  }

  /**
   * 拖动时更新 CSS 宽度变量。
   * @param event 指针事件。
   * @returns 无返回值。
   */
  function resizePanels(event: PointerEvent): void {
    if (!resizing.value || !layoutRef.value) return;
    const rect = layoutRef.value.getBoundingClientRect();
    const width = Math.min(Math.max(event.clientX - rect.left, rect.width * 0.2), rect.width * 0.7);
    document.documentElement.style.setProperty("--sidebar-width", `${width}px`);
  }

  /**
   * 结束拖拽。
   * @returns 无返回值。
   */
  function stopResize(): void {
    resizing.value = false;
  }

  /**
   * 同步窄屏状态，窄屏下文件区展开时不挂载预览区。
   * @returns 清理监听函数。
   */
  function watchNarrowLayout(): () => void {
    const query = window.matchMedia("(max-width: 860px)");
    const update = () => {
      narrowLayout.value = query.matches;
      if (query.matches) stopResize();
    };
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }

  onMounted(() => {
    cleanupNarrowLayout = watchNarrowLayout();
    window.addEventListener("pointermove", resizePanels);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  });

  onUnmounted(() => {
    cleanupNarrowLayout?.();
    window.removeEventListener("pointermove", resizePanels);
    window.removeEventListener("pointerup", stopResize);
    window.removeEventListener("pointercancel", stopResize);
  });

  return {
    layoutRef,
    resizerRef,
    resizing,
    sidebarCollapsed,
    previewMaximized,
    narrowLayout,
    shouldShowPreview,
    layoutClass,
    startResize
  };
}
