import { computed, onMounted, onUnmounted, ref } from "vue";
import { readConfigValue, writeConfigValue } from "../api/readerConfig";

const LAYOUT_RATIO_KEY = "reader.layout.sidebarRatio";
const MIN_SIDEBAR_RATIO = 0.2;
const MAX_SIDEBAR_RATIO = 0.7;

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
    const ratio = clampSidebarRatio((event.clientX - rect.left) / rect.width);
    applySidebarRatio(ratio);
    void writeSidebarRatio(ratio);
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
    void restoreSidebarRatio();
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

  /**
   * 恢复侧栏比例配置。
   * @returns 异步完成信号。
   */
  async function restoreSidebarRatio(): Promise<void> {
    applySidebarRatio(await readSidebarRatio());
  }

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

/**
 * 约束侧栏比例范围。
 * @param value 原始比例值。
 * @returns 合法比例值。
 */
function clampSidebarRatio(value: number): number {
  return Math.min(Math.max(value, MIN_SIDEBAR_RATIO), MAX_SIDEBAR_RATIO);
}

/**
 * 应用侧栏比例到根样式变量。
 * @param ratio 侧栏比例。
 * @returns 无返回值。
 */
function applySidebarRatio(ratio: number): void {
  document.documentElement.style.setProperty("--sidebar-width", `${Math.round(ratio * 1000) / 10}%`);
}

/**
 * 读取本地保存的侧栏比例。
 * @returns 侧栏比例。
 */
async function readSidebarRatio(): Promise<number> {
  try {
    const raw = await readConfigValue<number>(LAYOUT_RATIO_KEY);
    if (!raw) return 0.3;
    if (!Number.isFinite(raw)) return 0.3;
    return clampSidebarRatio(raw);
  } catch {
    return 0.3;
  }
}

/**
 * 保存侧栏比例到本地。
 * @param ratio 侧栏比例。
 * @returns 无返回值。
 */
async function writeSidebarRatio(ratio: number): Promise<void> {
  try {
    await writeConfigValue<number>(LAYOUT_RATIO_KEY, ratio);
  } catch {
    // 忽略本地存储不可用，当前会话布局仍可正常使用。
  }
}
