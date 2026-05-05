<template>
  <div class="app">
    <main ref="layoutRef" :class="layoutClass">
      <FileSidebar
        v-if="!sidebarCollapsed && !previewMaximized"
        v-model:keyword="searchKeyword"
        :entries="filteredEntries"
        :selected-name="selectedName"
        :path-label="pathLabel"
        :has-root="Boolean(rootHandle)"
        :has-current-directory="Boolean(currentHandle)"
        :can-go-up="canGoUp"
        :global-search="globalSearch"
        @open-directory="openDirectory"
        @open-entry="openEntry"
        @open-global-result="openGlobalSearchResult"
        @start-global-search="startGlobalSearch"
        @cancel-global-search="cancelGlobalSearch"
        @clear-global-search="clearGlobalSearch"
        @reload="loadDirectory(currentHandle)"
        @home="goHome"
        @go-up="goUp"
        @theme="themePanelVisible = true"
        @collapse="sidebarCollapsed = true"
      />

      <button
        v-if="!sidebarCollapsed && !previewMaximized"
        ref="resizerRef"
        class="resizer"
        type="button"
        title="拖动调整文件区和预览区宽度"
        @pointerdown="startResize"
      ></button>

      <PreviewPane
        v-if="shouldShowPreview"
        v-model:draft-text="draftText"
        :preview="preview"
        :file-title="fileTitle"
        :file-meta="fileMeta"
        :preview-timing="previewTiming"
        :has-text="Boolean(currentText)"
        :current-text="currentText"
        :has-file="Boolean(currentFile)"
        :can-save="canSave"
        :can-edit-preview="canEditPreview"
        :can-toggle-html-preview="canToggleHtmlPreview"
        :html-preview-mode="htmlPreviewMode"
        :image-display-mode="imageDisplayMode"
        :preview-editing="previewEditing"
        :is-preview-maximized="previewMaximized"
        :image-position="imagePosition"
        :image-count="imageCount"
        :can-open-previous-image="canOpenPreviousImage"
        :can-open-next-image="canOpenNextImage"
        :root-handle="rootHandle"
        :base-path-parts="currentFileDirectoryPath"
        :create-object-url="createObjectUrl"
        :edit-line-mode="editLineMode"
        :jump-line-request="{ line: pendingPreviewLineJump, token: pendingPreviewLineJumpToken }"
        :preview-scroll-key="previewScrollKey"
        @copy="copyCurrentText"
        @download="downloadCurrentFile"
        @save="saveDraft"
        @toggle-edit="togglePreviewEdit"
        @toggle-html-preview="toggleHtmlPreviewMode"
        @set-image-display-mode="setImageDisplayMode"
        @previous-image="openPreviousImage"
        @next-image="openNextImage"
        @expand="sidebarCollapsed = false"
        @toggle-fullscreen="previewMaximized = !previewMaximized"
        @open-relative="openRelative"
      />
    </main>
    <ConfirmDialog
      :visible="confirmDialog.visible"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      @confirm="resolveConfirmDialog(true)"
      @cancel="resolveConfirmDialog(false)"
    />
    <ThemePanel
      v-if="themePanelVisible"
      :settings="themeSettings"
      :effective-mode="effectiveThemeMode"
      @set-mode="setThemeMode"
      @set-custom-color="setCustomThemeColor"
      @reset-custom="resetCustomTheme"
      @close="themePanelVisible = false"
    />
    <TooltipLayer />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useReader } from "./module/useReader";
import { useResponsiveLayout } from "./module/useResponsiveLayout";
import { useThemeState } from "./theme/themeState";
import ConfirmDialog from "./module/ConfirmDialog.vue";
import FileSidebar from "./module/FileSidebar.vue";
import PreviewPane from "./module/PreviewPane.vue";
import ThemePanel from "./module/ThemePanel.vue";
import TooltipLayer from "./module/TooltipLayer.vue";

const reader = useReader();
const theme = useThemeState();
const {
  settings: themeSettings,
  effectiveMode: effectiveThemeMode,
  setMode: setThemeMode,
  setCustomColor: setCustomThemeColor,
  resetCustom: resetCustomTheme
} = theme;
const {
  filteredEntries,
  selectedName,
  searchKeyword,
  currentFile,
  currentText,
  draftText,
  previewEditing,
  canEditPreview,
  canToggleHtmlPreview,
  canSave,
  imageCount,
  imagePosition,
  canOpenPreviousImage,
  canOpenNextImage,
  editLineMode,
  htmlPreviewMode,
  imageDisplayMode,
  currentHandle,
  currentFileDirectoryPath,
  pendingPreviewLineJump,
  pendingPreviewLineJumpToken,
  globalSearch,
  preview,
  fileTitle,
  fileMeta,
  previewTiming,
  confirmDialog,
  pathLabel,
  rootHandle,
  openDirectory,
  loadDirectory,
  openEntry,
  goUp,
  goHome,
  restoreLastSession,
  copyCurrentText,
  downloadCurrentFile,
  saveDraft,
  togglePreviewEdit,
  toggleHtmlPreviewMode,
  setImageDisplayMode,
  startGlobalSearch,
  cancelGlobalSearch,
  clearGlobalSearch,
  openGlobalSearchResult,
  openPreviousImage,
  openNextImage,
  createObjectUrl,
  resolveConfirmDialog
} = reader;
const themePanelVisible = ref(false);
const {
  layoutRef,
  resizerRef,
  sidebarCollapsed,
  previewMaximized,
  shouldShowPreview,
  layoutClass,
  startResize
} = useResponsiveLayout();
const canGoUp = computed(() => Boolean(rootHandle.value && pathLabel.value.split("/").filter(Boolean).length > 1));
const previewScrollKey = computed(() => {
  if (currentFile.value) {
    const path = [...currentFileDirectoryPath.value, currentFile.value.name].join("/");
    return `${preview.kind}:${path}`;
  }
  return `${preview.kind}:${fileTitle.value}`;
});

/**
 * 打开相对文件并按 hash 滚动。
 * @param href 相对链接地址。
 * @returns 异步完成信号。
 */
async function openRelative(href: string): Promise<void> {
  const hash = await reader.openRelativeDocument(href);
  if (hash) requestAnimationFrame(() => scrollToDocumentHash(hash));
}

/**
 * 滚动到 Markdown 文档锚点。
 * @param hash hash 字符串。
 * @returns 无返回值。
 */
function scrollToDocumentHash(hash: string): void {
  const id = decodeURIComponent(hash.slice(1));
  if (!id) return;
  const escaped = typeof CSS !== "undefined" ? CSS.escape(id) : id.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
  const target = document.querySelector(`#${escaped}`) || document.querySelector(`[name="${escaped}"]`);
  target?.scrollIntoView({ block: "start" });
}

/**
 * 处理图片阅读快捷键。
 * @param event 键盘事件。
 * @returns 无返回值。
 */
function handleReaderKeydown(event: KeyboardEvent): void {
  if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey || previewEditing.value) return;
  if (isEditableTarget(event.target)) return;
  if (event.key === "ArrowRight" || event.key === " ") {
    if (!canOpenNextImage.value) return;
    event.preventDefault();
    void openNextImage();
    return;
  }
  if (event.key === "ArrowLeft" || event.key === "Backspace") {
    if (!canOpenPreviousImage.value) return;
    event.preventDefault();
    void openPreviousImage();
  }
}

/**
 * 判断事件目标是否为可编辑区域。
 * @param target 事件目标。
 * @returns 是否应跳过全局快捷键。
 */
function isEditableTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tagName = element.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || element.isContentEditable;
}

onMounted(() => {
  void restoreLastSession();
  window.addEventListener("keydown", handleReaderKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleReaderKeydown);
});
</script>
