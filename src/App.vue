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
        @open-directory="openDirectory"
        @open-entry="openEntry"
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
        :has-file="Boolean(currentFile)"
        :can-save="canSave"
        :can-edit-preview="canEditPreview"
        :preview-editing="previewEditing"
        :is-preview-maximized="previewMaximized"
        :root-handle="rootHandle"
        :base-path-parts="currentFileDirectoryPath"
        :create-object-url="createObjectUrl"
        :edit-line-mode="editLineMode"
        @copy="copyCurrentText"
        @download="downloadCurrentFile"
        @save="saveDraft"
        @toggle-edit="togglePreviewEdit"
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useReader } from "./module/useReader";
import { useResponsiveLayout } from "./module/useResponsiveLayout";
import { useThemeState } from "./theme/themeState";
import ConfirmDialog from "./module/ConfirmDialog.vue";
import FileSidebar from "./module/FileSidebar.vue";
import PreviewPane from "./module/PreviewPane.vue";
import ThemePanel from "./module/ThemePanel.vue";

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
  canSave,
  editLineMode,
  currentHandle,
  currentFileDirectoryPath,
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

onMounted(() => {
  void restoreLastSession();
});
</script>
